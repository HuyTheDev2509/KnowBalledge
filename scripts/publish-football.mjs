// Explicit operator action: upload reviewed data, never credentials or raw responses.
import { readFile } from 'node:fs/promises';
import { redisCommand } from '../lib/server/redis.mjs';

const players = JSON.parse(await readFile(process.argv[2] || '.data/players.json', 'utf8'));
if (!Array.isArray(players) || !players.length || players.some(p =>
  !p.id || !p.name || !Array.isArray(p.aliases) || !p.season || !p.club ||
  !p.nationality || !p.league || !p.position || !(p.heightCm > 0) || !(p.weightKg > 0))) {
  throw new Error('No valid reviewed player cache. Run the importer and inspect players.json first.');
}
await redisCommand(['SET', 'knowballedge:football-cache:v1', JSON.stringify(players)]);
console.log(`Published ${players.length} historical season records. Existing active matches are preserved.`);
