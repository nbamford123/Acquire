import { buySharesReducer } from '../reducers/buySharesReducer.ts';
import { advanceTurnOrchestrator } from './advanceTurnOrchestrator.ts';
import type { BuySharesAction, OrchestratorActionFunction } from '../types/index.ts';

export const buySharesOrchestrator: OrchestratorActionFunction<BuySharesAction> = (
  gameState,
  buySharesAction,
) => {
  const updatedState = {
    ...gameState,
    ...buySharesReducer(gameState, buySharesAction.payload.shares),
  };
  return advanceTurnOrchestrator(updatedState);
};
