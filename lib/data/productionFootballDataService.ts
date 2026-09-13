import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Player } from '../game/types';
import { eligible } from '../game/engine';
import { redisConfigured, redisCommand } from '../server/redis.mjs';

// A reviewed import is durable in Redis. No Sportmonks request per game.
export async function productionPlayers(): Promise<Player[] | null> {
  let payload: string | null = null;
  if (redisConfigured()) {
    const value = await redisCommand(['GET', 'knowballedge:football-cache:v1']);
    if (typeof value === 'string') payload = value;
  } else if (!process.env.VERCEL) {
    try { payload = await readFile(join(process.cwd(), '.data', 'players.json'), 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  if (!payload) return null;
  const players: unknown = JSON.parse(payload);
  if (!Array.isArray(players)) throw new Error('The imported squad cache is invalid.');
  const valid = (players as Player[]).filter(eligible);
  return valid.length ? valid : null;
}
