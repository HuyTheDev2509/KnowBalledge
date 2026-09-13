export type Player = {id:string; name:string; aliases:string[]; nationality:string; countryCode:string; league:string; club:string; season:string; position:string; heightCm:number; weightKg:number; imageUrl?:string; appearances?:number; minutes?:number; featured?:boolean};
export type Hint = {type:string; value:string; code?:string};
export type Selection = {season:string; mode:'league'|'country'; category:string};
export type GameState = {id:string; selection:Selection; player:Player; stage:number; attempts:number; status:'playing'|'won'|'lost'; score:number; history:{name:string;correct:boolean;stage:number}[]; version:number; createdAt:number};
export type PublicGame = Omit<GameState,'player'> & {hints:Hint[];totalHints:number;player?:Player; message?:string; dataMode:string};
export const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ø/g,'o').replace(/ł/g,'l').replace(/[^a-z0-9]/g,'');
export const seasonLabel=(y:number)=>`${y}/${String(y+1).slice(-2)}`;
export const leagues=[{name:'Premier League',country:'England',code:'GB-ENG',flag:'🏴',color:'#8d70d6'},{name:'LaLiga',country:'Spain',code:'ES',flag:'🇪🇸',color:'#e87d5a'},{name:'Bundesliga',country:'Germany',code:'DE',flag:'🇩🇪',color:'#dd5960'},{name:'Serie A',country:'Italy',code:'IT',flag:'🇮🇹',color:'#529afa'},{name:'Ligue 1',country:'France',code:'FR',flag:'🇫🇷',color:'#b4c95c'}];
export const countries=[['Brazil','BR','🇧🇷'],['Argentina','AR','🇦🇷'],['France','FR','🇫🇷'],['England','GB-ENG','🏴'],['Spain','ES','🇪🇸'],['Germany','DE','🇩🇪'],['Portugal','PT','🇵🇹'],['Italy','IT','🇮🇹'],['Netherlands','NL','🇳🇱'],['Belgium','BE','🇧🇪'],['Croatia','HR','🇭🇷'],['Uruguay','UY','🇺🇾']];
