import { GamePhase, type GameState } from '../types/index.ts';
import { boardTiles, canBuyShares } from '../domain/index.ts';
import { advanceTurnOrchestrator } from './advanceTurnOrchestrator.ts';

export const proceedToBuySharesOrchestrator = (
  gameState: GameState,
): GameState => {
  if (
    canBuyShares(
      gameState.players[gameState.currentPlayer].money,
      gameState.hotels,
      boardTiles(gameState.tiles),
    )
  ) {
    return {
      ...gameState,
      currentPhase: GamePhase.BUY_SHARES,
    };
  }
  // otherwise, enter action and advance turn
  return advanceTurnOrchestrator(gameState);
};
