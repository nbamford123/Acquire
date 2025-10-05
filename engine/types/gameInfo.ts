import type { GamePhase } from './gameState.ts';
export type GameInfo = {
  id: string;
  currentPlayer: string;
  players: string[];
  phase: GamePhase;
  lastUpdated: number;
};
