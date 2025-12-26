import { GamePhase, type OrchestratorFunction } from '../types/index.ts';
import { boardTiles, gameOver } from '../domain/index.ts';
import { drawAndReplaceTilesReducer, endGameReducer } from '../reducers/index.ts';

export const advanceTurnOrchestrator: OrchestratorFunction = (
  gameState,
) => {
  const { currentPlayer, currentTurn, players, tiles } = gameState;

  if (gameOver(boardTiles(gameState.tiles), gameState.hotels)) {
    const [endGameState, endGameActions] = endGameReducer(gameState);
    return [{
      ...gameState,
      currentPhase: GamePhase.GAME_OVER,
      ...endGameState,
      mergeContext: undefined,
      mergerTieContext: undefined,
      foundHotelContext: undefined,
    }, endGameActions];
  }
  const nextPlayerId = (currentPlayer + 1) % players.length;
  return [{
    ...gameState,
    currentPhase: GamePhase.PLAY_TILE,
    currentPlayer: nextPlayerId,
    currentTurn: nextPlayerId === 0 ? currentTurn + 1 : currentTurn,
    ...drawAndReplaceTilesReducer(currentPlayer, tiles, players),
    mergeContext: undefined,
    mergerTieContext: undefined,
    foundHotelContext: undefined,
    error: undefined,
  }, []];
};
