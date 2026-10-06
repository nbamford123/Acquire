import {
  BreakMergerTieAction,
  GamePhase,
  type GameState,
  type PlayerAction,
} from '../types/index.ts';
import { boardTiles, getMergeContext, mergeHotels } from '../domain/index.ts';
import { prepareMergerReducer } from '../reducers/prepareMergerReducer.ts';
import { proceedToBuySharesOrchestrator } from './proceedToBuySharesOrchestrator.ts';

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
    // Drop details of any previous merger so they aren't mistaken for the pending one
    const { originalHotels, additionalTiles, survivingHotel } = result.mergeContext;
    return [{
      ...gameState,
      currentPhase: GamePhase.BREAK_MERGER_TIE,
      mergerTieContext: {
        tiedHotels: result.tiedHotels,
      },
      mergeContext: { originalHotels, additionalTiles, survivingHotel },
    }, []];
  }
  const [updatedState, actions] = prepareMergerReducer(
    gameState.players,
    gameState.tiles,
    gameState.hotels,
    result,
    gameState.currentPlayer,
  );
  const mergedState: GameState = {
    ...gameState,
    currentPhase: GamePhase.RESOLVE_MERGER,
    ...updatedState,
  };
  const log = (action: string) => ({
    turn: gameState.currentTurn,
    player: gameState.currentPlayer,
    action,
  });
  const mergerActions = [
    log(
      `${
        gameState.players[gameState.currentPlayer].name
      } merged ${result.mergedHotel} into ${result.survivingHotel}`,
    ),
    ...actions.map(log),
  ];

  if (mergedState.mergeContext?.stockholderIds?.length) {
    return [mergedState, mergerActions];
  }
  // Nobody holds shares in the merged hotel, so there's nothing to resolve
  const [nextState, nextActions] = mergedState.mergeContext?.originalHotels.length
    ? processMergerOrchestrator(mergedState)
    : proceedToBuySharesOrchestrator(mergedState);
  return [nextState, [...mergerActions, ...nextActions]];
};
