import type { GamePhase } from './gameState.ts';
export type GameList = {
  id: string;
  players: string[];
  phase: GamePhase;
  lastUpdated: number;
}[];
