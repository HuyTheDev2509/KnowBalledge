import 'server-only';
import type { GameState } from '../game/types';
import { redisConfigured, redisCommand } from './redis.mjs';

const lifetime = 86_400_000;
const sessionKey = (id: string, owner: string) => `knowballedge:session:${owner}:${id}`;

// Never use process memory or /tmp for serverless persistence.
async function localDatabase() {
  if (process.env.VERCEL) {
    throw new Error('Match storage is not configured. Connect Upstash Redis in Vercel and redeploy.');
  }
  const { DatabaseSync } = await import('node:sqlite');
  const { mkdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const directory = join(process.cwd(), '.local');
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(join(directory, 'knowballedge.sqlite'));
  db.exec(`PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY, owner TEXT NOT NULL, state TEXT NOT NULL,
      version INTEGER NOT NULL, expires_at INTEGER NOT NULL
    );`);
  return db;
}

export async function readSession(id: string, owner: string): Promise<GameState | null> {
  if (!id || !owner) return null;
  if (redisConfigured()) {
    const state = await redisCommand(['GET', sessionKey(id, owner)]);
    if (typeof state !== 'string') return null;
    const game = JSON.parse(state) as GameState;
    return game.createdAt + lifetime > Date.now() ? game : null;
  }
  const db = await localDatabase();
  try {
    const row = db.prepare('SELECT state FROM game_sessions WHERE id = ? AND owner = ? AND expires_at > ?')
      .get(id, owner, Date.now());
    return row ? JSON.parse(String(row.state)) as GameState : null;
  } finally { db.close(); }
}

export async function createSession(game: GameState, owner: string): Promise<void> {
  if (redisConfigured()) {
    const result = await redisCommand(['SET', sessionKey(game.id, owner), JSON.stringify(game), 'NX', 'PX', lifetime]);
    if (result !== 'OK') throw new Error('Could not create the match. Please try again.');
    return;
  }
  const db = await localDatabase();
  try {
    db.prepare('DELETE FROM game_sessions WHERE expires_at <= ?').run(Date.now());
    db.prepare('INSERT INTO game_sessions (id,owner,state,version,expires_at) VALUES (?,?,?,?,?)')
      .run(game.id, owner, JSON.stringify(game), game.version, game.createdAt + lifetime);
  } finally { db.close(); }
}

// Atomic comparison and write preserve double-guess protection across instances.
const compareAndSet = `
local value = redis.call('GET', KEYS[1])
if not value then return 0 end
local game = cjson.decode(value)
if game.version ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'KEEPTTL')
return 1`;

export async function updateSession(game: GameState, owner: string, version: number): Promise<boolean> {
  if (redisConfigured()) {
    return await redisCommand(['EVAL', compareAndSet, 1, sessionKey(game.id, owner), version, JSON.stringify(game)]) === 1;
  }
  const db = await localDatabase();
  try {
    const result = db.prepare('UPDATE game_sessions SET state = ?, version = ? WHERE id = ? AND owner = ? AND version = ? AND expires_at > ?')
      .run(JSON.stringify(game), game.version, game.id, owner, version, Date.now());
    return result.changes === 1;
  } finally { db.close(); }
}
