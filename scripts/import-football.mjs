/** Import historical squads from Sportmonks. Never uses current club membership.
 * node --env-file=.env.local scripts/import-football.mjs
 * Writes a reviewed JSON cache. No production mutation.
 */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const token=process.env.SPORTMONKS_API_TOKEN;
if(!token){console.error('Set SPORTMONKS_API_TOKEN in .env.local to import licensed historical squads. The game works without it in demo mode.');process.exit(1)}
const output=process.argv[2]??'.data';await mkdir(output,{recursive:true});await mkdir(`${output}/requests`,{recursive:true});
const BASE='https://api.sportmonks.com/v3/football/';
const MIN_APPEARANCES=Number(process.env.MIN_APPEARANCES??3),MIN_MINUTES=Number(process.env.MIN_MINUTES??150);
const featured=new Set((process.env.FEATURED_PLAYER_IDS??'').split(',').filter(Boolean));
async function get(path){const u=new URL(path,BASE);if(u.origin!=='https://api.sportmonks.com')throw Error('Unexpected API pagination origin');const key=createHash('sha256').update(u.href).digest('hex'),file=`${output}/requests/${key}.json`;try{const cached=JSON.parse(await readFile(file,'utf8'));if(Date.now()-cached.at<86400000)return cached.data}catch{}const r=await fetch(u,{headers:{Authorization:token},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`Sportmonks HTTP ${r.status}. Import stopped; existing game cache remains intact.`);const data=await r.json();await writeFile(file,JSON.stringify({at:Date.now(),data}));return data}
async function all(path){const out=[];for(let page=1;page<=100;page++){const d=await get(path+(path.includes('?')?'&':'?')+'page='+page+'&per_page=50');out.push(...(d.data??[]));if(!d.pagination?.has_more)return out}throw Error('Unexpected pagination size')}
const leagueMap=new Map([['Premier League','Premier League'],['La Liga','LaLiga'],['LaLiga','LaLiga'],['Bundesliga','Bundesliga'],['Serie A','Serie A'],['Ligue 1','Ligue 1']]);
const seasons=(await all('seasons?include=league')).filter(s=>leagueMap.has(s.league?.name)&&s.league?.gender!=='female'&&Number(s.name?.slice(0,4))>=2015&&Number(s.name?.slice(0,4))<=2026);
function value(d){const v=d?.value;return Number(typeof v==='object'?v?.total??v?.all??0:v??0)}
function position(n){return ({'Attacker':'Forward','Center Back':'Centre Back','Centre-Back':'Centre Back','Left-Back':'Left Back','Right-Back':'Right Back','Centre-Forward':'Centre Forward','Center Forward':'Centre Forward','Central Midfield':'Central Midfielder','Defensive Midfield':'Defensive Midfielder','Attacking Midfield':'Attacking Midfielder'}[n]??n)||''}
const players=[];
for(const s of seasons){const year=Number(s.name.slice(0,4)),season=`${year}/${String(year+1).slice(-2)}`,league=leagueMap.get(s.league.name);const teams=await all(`teams/seasons/${s.id}`);for(const team of teams){if(team.placeholder||team.gender==='female')continue;const squad=(await get(`squads/seasons/${s.id}/teams/${team.id}?include=player.nationality;player.detailedPosition;position;details.type`)).data??[];for(const row of squad){const p=row.player;if(!p)continue;const details=row.details??[];const appearances=value(details.find(d=>/appearances/i.test(d.type?.code??d.type?.name??''))),minutes=value(details.find(d=>/minutes.played/i.test(d.type?.code??d.type?.name??'')));const isFeatured=featured.has(String(p.id));if(!isFeatured&&appearances<MIN_APPEARANCES&&minutes<MIN_MINUTES)continue;const name=p.common_name||p.display_name||p.name,nationality=p.nationality?.name,pos=position(row.position?.name||p.detailedPosition?.name),heightCm=Number(p.height),weightKg=Number(p.weight);if(!name||!nationality||!pos||!heightCm||!weightKg)continue;players.push({id:`sm-${p.id}`,name,aliases:[p.common_name,p.display_name,p.name].filter(Boolean),nationality,countryCode:nationality==='England'?'GB-ENG':p.nationality?.iso2??'',league,club:team.name,clubId:String(team.id),leagueId:String(s.league_id),season,position:pos,heightCm,weightKg,dateOfBirth:p.date_of_birth,shirtNumber:row.jersey_number,appearances,minutes,featured:isFeatured});} }console.log(`Imported ${season} ${league}; ${players.length} eligible season records so far.`)}
if(!players.length)throw Error('No eligible historical records. Check subscription coverage, statistics includes and thresholds. No cache generated.');
const unique=[...new Map(players.map(p=>[`${p.id}:${p.season}:${p.clubId}`,p])).values()];
await writeFile(`${output}/players.json`,JSON.stringify(unique,null,2));
console.log(`Ready: ${unique.length} season records in ${output}/players.json. Review before running pnpm data:publish. No token stored. Portraits disabled by default until image rights are confirmed.`);
