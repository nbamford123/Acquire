import { proceedToBuySharesOrchestrator, processMergerOrchestrator } from './index.ts';
import { getHotelByName, getMergeContext } from '../domain/index.ts';
import { completeMergerReducer } from '../reducers/index.ts';
import type { GameState, OrchestratorActionFunction, ResolveMergerAction } from '../types/index.ts';

export const resolveMergerOrchestrator: OrchestratorActionFunction<ResolveMergerAction> = (
  gameState,
  action,
) => {
  const mergeContext = getMergeContext(gameState);
  const survivor = getHotelByName(gameState.hotels, mergeContext.survivingHotel || '');
  const merged = getHotelByName(gameState.hotels, mergeContext.mergedHotel || '');
  const stockholderIds = mergeContext.stockholderIds || [];
  // Apply the share trading/selling state changes
  const { player, shares } = action.payload;
  const playerId = gameState.players.findIndex((p) => p.name === player);
  const [completedMegerState, actions] = completeMergerReducer(
    gameState,
    playerId,
    shares,
    survivor,
    merged,
  );
  const updatedState = {
    ...gameState,
    ...completedMegerState,
  };
  const remainingStockholderIds = stockholderIds.slice(1);
  if (remainingStockholderIds.length) {
    // More stockholders in this merger
    return [{
      ...updatedState,
      mergeContext: {
        ...mergeContext,
        stockholderIds: remainingStockholderIds,
      },
    }, actions];
  } else if (mergeContext.originalHotels.length) {
    // More mergers to perform
    const [newState, newActions] = processMergerOrchestrator(updatedState);
    return [newState, [...actions, ...newActions]];
  } else {
    // All done, move to buy shares
    const [newState, newActions] = proceedToBuySharesOrchestrator(updatedState);
    return [newState, [...actions, ...newActions]];
  }
};
