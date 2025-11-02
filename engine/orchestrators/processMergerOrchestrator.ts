import { GamePhase, type GameState, type ResolvedTie } from '../types/index.ts';
import { boardTiles, getMergeContext, mergeHotels } from '../domain/index.ts';
import { prepareMergerReducer } from '../reducers/prepareMergerReducer.ts';

export const processMergerOrchestrator = (
  gameState: GameState,
  resolvedTie?: ResolvedTie,
): GameState => {
  const gameBoard = boardTiles(gameState.tiles);
  const mergeContext = getMergeContext(gameState);
  const result = mergeHotels(
    mergeContext,
    gameBoard,
    resolvedTie,
  );
  // Found a tie, send back to player for resolution
  if (result.needsMergeOrder) {
    return {
      ...gameState,
      currentPhase: GamePhase.BREAK_MERGER_TIE,
      mergerTieContext: {
        tiedHotels: result.tiedHotels,
      },
      mergeContext: { ...gameState.mergeContext, ...result.mergeContext },
    };
  }
  return {
    ...gameState,
    currentPhase: GamePhase.RESOLVE_MERGER,
    ...prepareMergerReducer(
      gameState.players,
      gameState.tiles,
      gameState.hotels,
      result,
    ),
  };
};
