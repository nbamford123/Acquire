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

  const [buySharesState, actions] = buySharesOrchestrator(gameState, action);
  return [buySharesState, [...actions, {
    turn: gameState.currentTurn,
    action: `${gameState.players[gameState.currentPlayer].name} buys ${
      Object.entries(shares).filter(([, shares]) => shares > 0).map(([hotel, shares], idx) =>
        `${shares} shares of ${hotel}${idx < Object.entries(shares).length ? ', ' : ''}`
      )
    }`,
  }]];
};
