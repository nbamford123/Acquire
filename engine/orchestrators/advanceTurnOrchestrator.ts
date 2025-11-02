import { GamePhase, type GameState } from '../types/index.ts';
import { drawAndReplaceTilesReducer } from '../reducers/drawAndReplaceTilesReducer.ts';

export const advanceTurnOrchestrator = (
  gameState: GameState,
): GameState => {
  const { currentPlayer, currentTurn, players, tiles } = gameState;

  const nextPlayerId = (currentPlayer + 1) % players.length;
  return {
    ...gameState,
    currentPhase: GamePhase.PLAY_TILE,
    currentPlayer: nextPlayerId,
    currentTurn: nextPlayerId === 0 ? currentTurn + 1 : currentTurn,
    ...drawAndReplaceTilesReducer(currentPlayer, tiles, players),
    mergeContext: undefined,
    mergerTieContext: undefined,
    foundHotelContext: undefined,
    error: undefined,
  };
};
