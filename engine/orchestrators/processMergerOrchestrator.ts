import {
  BreakMergerTieAction,
  GamePhase,
  type GameState,
  type PlayerAction,
} from '../types/index.ts';
import { boardTiles, getMergeContext, mergeHotels } from '../domain/index.ts';
import { prepareMergerReducer } from '../reducers/prepareMergerReducer.ts';

export const processMergerOrchestrator = (
  gameState: GameState,
  breakMergerTieAction?: BreakMergerTieAction,
): [GameState, PlayerAction[]] => {
  const gameBoard = boardTiles(gameState.tiles);
  const mergeContext = getMergeContext(gameState);
  const result = mergeHotels(
    mergeContext,
    gameBoard,
    breakMergerTieAction?.payload.resolvedTie,
  );
  // Found a tie, send back to player for resolution
  if (result.needsMergeOrder) {
    return [{
      ...gameState,
      currentPhase: GamePhase.BREAK_MERGER_TIE,
      mergerTieContext: {
        tiedHotels: result.tiedHotels,
      },
      mergeContext: { ...gameState.mergeContext, ...result.mergeContext },
    }, []];
  }
  const [updatedState, actions] = prepareMergerReducer(
    gameState.players,
    gameState.tiles,
    gameState.hotels,
    result,
  );
  return [
    {
      ...gameState,
      currentPhase: GamePhase.RESOLVE_MERGER,
      ...updatedState,
    },
    [{
      turn: gameState.currentTurn,
      action:
        `${gameState.currentPlayer} merged ${result.mergedHotel} into ${result.survivingHotel}`,
    }, ...actions.map((action) => ({ turn: gameState.currentTurn, action }))],
  ];
};
