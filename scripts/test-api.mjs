import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
let cookie = '';
async function call(path, body, expected = 200, asOwner = true) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { ...(body ? { 'Content-Type': 'application/json', Origin: new URL(base).origin } : {}), ...(asOwner && cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const value = await response.json();
  assert.equal(response.status, expected, `${path}: ${JSON.stringify(value)}`);
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) { assert.match(setCookie, /httponly/i); cookie = setCookie.split(';')[0]; }
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return value;
}
const catalog = await call('/api/seasons');
assert.equal(catalog.dataMode, 'demo');
assert.equal(catalog.count, 48);
assert.equal(catalog.seasons.find(s => s.name === '2026/27').available, false);
assert.equal((await call('/api/leagues?season=2015%2F16')).length, 5);
assert.equal((await call('/api/countries?season=2015%2F16')).length, 12);
const names = ['Harry Kane','Erling Haaland','Robert Lewandowski','Karim Benzema','Luka Modrić','Toni Kroos','Virgil van Dijk','Alisson Becker','Thibaut Courtois','Manuel Neuer','Lionel Messi','Cristiano Ronaldo'];
const candidates = [];
for (const name of names) candidates.push((await call('/api/players?q=' + encodeURIComponent(name)))[0]);
assert(candidates.every(Boolean));
const neymar = (await call('/api/players?q=Neymar'))[0];
assert((await call('/api/players?q=mbappe')).some(p => p.name.includes('Mbappé')));
const selection = { season:'2015/16', mode:'country', category:'Brazil' };
let g = await call('/api/game/start', {selection, recent:[]});
assert(!('player' in g));
await call('/api/game/' + g.id, undefined, 503, false);
assert.equal((await call('/api/game/' + g.id)).version, 0);
await call('/api/game/guess', {sessionId:g.id, playerId:'not-a-player', version:g.version}, 400);
assert.equal((await call('/api/game/' + g.id)).version, 0);
const hintTypes = ['Nationality','League','Position','Height','Weight'];
for (let i=0;i<8;i++) {
  g = await call('/api/game/guess', {sessionId:g.id, playerId:candidates[i].id, version:g.version});
  assert.equal(g.stage,Math.floor((i+1)/2));
  assert.equal(g.attempts,(i+1)%2);
  assert.deepEqual(g.hints.map(h=>h.type),hintTypes.slice(0,g.stage+1));
  assert(!('player' in g));
  if(i===0) await call('/api/game/guess', {sessionId:g.id,playerId:candidates[0].id,version:g.version},400);
}
g = await call('/api/game/guess', {sessionId:g.id,playerId:neymar.id,version:g.version});
assert.equal(g.status,'won'); assert.equal(g.score,300); assert.equal(g.player.id,neymar.id);
await call('/api/game/guess', {sessionId:g.id,playerId:candidates[9].id,version:g.version},400);
const previous=g.id;
g=await call('/api/game/start',{selection,recent:[neymar.id]});
assert.notEqual(g.id,previous); assert.equal(g.version,0);
for(let i=0;i<10;i++) g=await call('/api/game/guess',{sessionId:g.id,playerId:candidates[i].id,version:g.version});
assert.equal(g.status,'lost'); assert.equal(g.score,0); assert.equal(g.history.length,10);
g=await call('/api/game/start',{selection,recent:[]});
g=await call('/api/game/guess',{sessionId:g.id,playerId:neymar.id,version:g.version});
assert.equal(g.score,1100);
g=await call('/api/game/start',{selection:{season:'every',mode:'league',category:'Premier League'},recent:[]});
assert.equal(g.totalHints,6); assert.equal(g.hints[0].type,'Season');
// Both concurrent requests use a player outside this league's fixture pool.
const concurrent = await Promise.all([0,1].map(()=>fetch(base+'/api/game/guess',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,Origin:new URL(base).origin},body:JSON.stringify({sessionId:g.id,playerId:neymar.id,version:g.version})})));
assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
assert.equal((await call('/api/game/'+g.id)).version,1);
const badOrigin=await fetch(base+'/api/game/start',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://unrelated.example'},body:JSON.stringify({selection})});
assert.equal(badOrigin.status,403);
for(const path of ['/','/play','/play/mode','/play/category','/game/'+g.id,'/results/'+previous]) assert.equal((await fetch(base+path)).status,200,path);
console.log('PASS: demo catalog, league/country menus, autocomplete, hidden answers, ownership, resume, all hints, both win scores, loss, replay, Every Season, duplicate/invalid guesses, concurrent version protection, origin checks, and page routes.');
