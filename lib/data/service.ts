import {mockPlayers} from './mockDataService';
import {productionPlayers} from './productionFootballDataService';
export async function dataService(){const players=await productionPlayers();return {players:players??mockPlayers,mode:players?'verified':'demo'};}
