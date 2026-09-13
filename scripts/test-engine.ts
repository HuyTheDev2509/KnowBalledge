import assert from 'node:assert/strict';
import {guess,clues,publicGame,pickPlayer} from '../lib/game/engine';
import {mockPlayers} from '../lib/data/mockDataService';
import {GameState,normalize} from '../lib/game/types';
const base=():GameState=>({id:'test',selection:{season:'2021/22',mode:'league',category:'Ligue 1'},player:mockPlayers.find(p=>p.name==='Lionel Messi'&&p.season==='2021/22')!,stage:0,attempts:0,status:'playing',score:0,history:[],version:0,createdAt:0});
assert.equal(new Set(mockPlayers.map(p=>p.id)).size,48);
assert.deepEqual(clues(base()).map(h=>h.type),['Nationality','League','Position','Height','Weight']);
assert(!('player' in publicGame(base(),'demo')));
for(let stage=0;stage<5;stage++)for(let a=0;a<2;a++){const g=base();g.stage=stage;g.attempts=a;assert.equal(guess(g,g.player).score,1000-stage*200+(a===0?100:0));}
let g=base();for(let i=0;i<10;i++){const n=guess(g,{id:'wrong-'+i,name:'Wrong '+i});assert.equal(n.stage,Math.min(4,Math.floor((i+1)/2)));assert.equal(n.status,i===9?'lost':'playing');g=n;}assert.equal(g.score,0);assert.equal(publicGame(g,'demo').player?.name,'Lionel Messi');assert.throws(()=>guess(g,g.player));
g=guess(base(),{id:'wrong',name:'Other'});assert.throws(()=>guess(g,{id:'wrong',name:'Other'}));assert.equal(g.attempts,1);assert.equal(g.stage,0);
g=base();g.selection.season='every';assert.equal(clues(g).length,6);assert.equal(clues(g)[0].value,'2021/22');assert.equal(guess(g,g.player).score,1300);
assert.equal(normalize('Kylian Mbappé'),normalize('kylian mbappe'));
assert.equal(pickPlayer([base().player,{...base().player,id:'new'}],[base().player.id]).id,'new');
assert(mockPlayers.every(p=>Number(p.season.slice(0,4))<=2024));
console.log('PASS: scoring at every clue and attempt, 10-guess loss, duplicate prevention, hidden answer, accent normalization, Every Season and recent exclusion.');
