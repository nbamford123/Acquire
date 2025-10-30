import { resolveMergerValidation } from '../domain/resolveMergerValidation.ts';
import { buySharesOrchestrator, processMergerOrchestrator } from '../orchestrators/index.ts';
import { completeMergerReducer } from '../reducers/index.ts';
import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type ResolveMergerAction,
} from '../types/index.ts';

// What happens when a surviving hotel was picked, but there's another tie to be resolved?
export const resolveMergerUseCase = (
  gameState: GameState,
  action: ResolveMergerAction,
): GameState => {
  const { player, shares } = action.payload;
  const playerId = gameState.players.findIndex((p) => p.name === player);

  // Orchestration validation
  if (gameState.currentPhase !== GamePhase.RESOLVE_MERGER) {
    throw new GameError('Not resolve merge phase', GameErrorCodes.GAME_INVALID_ACTION);
  }
  if (!gameState.mergeContext) {
    throw new GameError('Missing merge context', GameErrorCodes.GAME_INVALID_ACTION);
  }
  // Domain validation (returns validated data)
  const { merged, survivor, stockholderIds } = resolveMergerValidation(
    gameState,
    playerId,
    shares,
  );

  // Apply the share trading/selling state changes
  const updatedState = {
    ...gameState,
    // TODO(me): this should be a use case
    ...completeMergerReducer(
      gameState,
      playerId,
      shares!, // validated in validation function
      survivor,
      merged,
    ),
  };

  const remainingStockholderIds = stockholderIds.slice(1);
  const mergeContext = gameState.mergeContext;

  // Orchestration: decide what happens next
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
      mergeContext,
    );
  } else {
    // All done, move to buy shares
    return buySharesOrchestrator(updatedState);
  }
};
