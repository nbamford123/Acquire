import type { GamePhase } from './gameState.ts';
export type GameInfo = {
  id: string;
  currentPlayer: string;
  players: string[];
  owner: string;
  phase: GamePhase;
  lastUpdated: number;
};
