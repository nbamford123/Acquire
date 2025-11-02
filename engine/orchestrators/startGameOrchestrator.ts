import { startGameReducer } from '../reducers/startGameReducers.ts';
import { GamePhase, type GameState } from '../types/index.ts';

export const startGameOrchestrator = (
  gameState: GameState,
): GameState => {
  const updatedState = startGameReducer(gameState.tiles, gameState.players);
  return {
    ...gameState,
    currentPhase: GamePhase.PLAY_TILE,
    currentPlayer: 0,
    currentTurn: 1,
    ...updatedState,
  };
};
