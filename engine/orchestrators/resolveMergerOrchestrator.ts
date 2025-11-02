import { proceedToBuySharesOrchestrator, processMergerOrchestrator } from './index.ts';
import { getHotelByName, getMergeContext } from '../domain/index.ts';
import { completeMergerReducer } from '../reducers/index.ts';
import type { GameState } from '../types/index.ts';

// What happens when a surviving hotel was picked, but there's another tie to be resolved?
export const resolveMergerOrchestrator = (
  gameState: GameState,
  playerId: number,
  shares: { sell: number; trade: number } | undefined,
): GameState => {
  const mergeContext = getMergeContext(gameState);
  const survivor = getHotelByName(gameState.hotels, mergeContext.survivingHotel || '');
  const merged = getHotelByName(gameState.hotels, mergeContext.mergedHotel || '');
  const stockholderIds = mergeContext.stockholderIds || [];
  // Apply the share trading/selling state changes
  const updatedState = {
    ...gameState,
    ...completeMergerReducer(
      gameState,
      playerId,
      shares,
      survivor,
      merged,
    ),
  };
  const remainingStockholderIds = stockholderIds.slice(1);
  if (remainingStockholderIds.length) {
    // More stockholders in this merger
    return {
      ...updatedState,
      mergeContext: {
        ...mergeContext,
        stockholderIds: remainingStockholderIds,
      },
    };
  } else if (mergeContext.originalHotels.length) {
    // More mergers to perform
    return processMergerOrchestrator(
      updatedState,
    );
  } else {
    // All done, move to buy shares
    return proceedToBuySharesOrchestrator(updatedState);
  }
};
