import { GamePhase, type GameState, type Player } from '../types/index.ts';
import { boardTiles, canBuyShares } from '../domain/index.ts';
import { advanceTurnUseCase } from '../usecases/index.ts';

// TODO(me): name this something better endTurnOrchestrator? completePlayTileOrchestrator?
// the way it's currently named interferes with the buyshares phase
export const buySharesOrchestrator = (
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
  return advanceTurnUseCase(gameState);
};
