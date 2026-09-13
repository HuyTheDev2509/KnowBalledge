import {db} from '../server/db';
import {Player} from '../game/types';
import {eligible} from '../game/engine';
// Historical imports are durable in D1, bounded to small rows. No external request per game.
export async function productionPlayers():Promise<Player[]|null>{const rows=await db().prepare("SELECT payload FROM football_cache WHERE id LIKE 'sportmonks-v1%' ORDER BY id").all<{payload:string}>();if(!rows.results.length)return null;return rows.results.flatMap(r=>JSON.parse(r.payload) as Player[]).filter(eligible);}
