import { boardTiles, buySharesValidation } from '../domain/index.ts';
import { buySharesOrchestrator } from '../orchestrators/index.ts';
import {
  type BuySharesAction,
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
} from '../types/index.ts';

export const buySharesUseCase = (
  gameState: GameState,
  action: BuySharesAction,
): GameState => {
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

  return buySharesOrchestrator(gameState, shares);
};
