import { startGameReducer } from '../reducers/startGameReducers.ts';
import { GamePhase, type OrchestratorFunction } from '../types/index.ts';

export const startGameOrchestrator: OrchestratorFunction = (
  gameState,
) => {
  const updatedState = startGameReducer(gameState.tiles, gameState.players);
  return [{
    ...gameState,
    ...updatedState,
    currentPhase: GamePhase.PLAY_TILE,
    currentPlayer: 0,
    currentTurn: 1,
  }, []];
};
