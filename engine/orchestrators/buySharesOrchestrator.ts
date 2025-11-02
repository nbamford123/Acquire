import type { GameState, HOTEL_NAME } from '../types/index.ts';
import { buySharesReducer } from '../reducers/buySharesReducer.ts';
import { advanceTurnOrchestrator } from './advanceTurnOrchestrator.ts';

export const buySharesOrchestrator = (
  gameState: GameState,
  shares: Record<HOTEL_NAME, number>,
): GameState => {
  const updatedState = {
    ...gameState,
    ...buySharesReducer(gameState, shares),
  };
  return advanceTurnOrchestrator(updatedState);
};
