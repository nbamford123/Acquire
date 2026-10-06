import { boardTiles, buySharesValidation } from '../domain/index.ts';
import { buySharesOrchestrator } from '../orchestrators/index.ts';
import {
  type BuySharesAction,
  GameError,
  GameErrorCodes,
  GamePhase,
  type UseCaseFunction,
} from '../types/index.ts';

export const buySharesUseCase: UseCaseFunction<BuySharesAction> = (
  gameState,
  action,
) => {
  const { player: playerName, shares } = action.payload;
  const playerId = gameState.players.findIndex((p) => p.name === playerName);
  if (gameState.currentPlayer !== playerId) {
    throw new GameError(
      'Not your turn',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  if (gameState.currentPhase !== GamePhase.BUY_SHARES) {
    throw new GameError(
      'Invalid action',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  const player = gameState.players[playerId];
  const gameBoard = boardTiles(gameState.tiles);
  // Domain validation
  buySharesValidation(player, shares, gameBoard, gameState.hotels);

  const bought = Object.entries(shares).filter(([, count]) => count > 0);
  const purchase = bought.length
    ? `bought ${bought.map(([hotel, count]) => `${count} ${hotel}`).join(', ')}`
    : "didn't buy any shares";
  const [buySharesState, actions] = buySharesOrchestrator(gameState, action);
  // The purchase comes before whatever the turn change logs (next turn, or end of game)
  return [buySharesState, [
    {
      turn: gameState.currentTurn,
      player: gameState.currentPlayer,
      action: `${player.name} ${purchase}`,
    },
    ...actions,
  ]];
};
