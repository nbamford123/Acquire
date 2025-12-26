import { playTileValidation } from '../domain/index.ts';
import { playTileOrchestrator } from '../orchestrators/playTileOrchestrator.ts';
import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type PlayTileAction,
  type UseCaseFunction,
} from '../types/index.ts';

export const playTileUseCase: UseCaseFunction<PlayTileAction> = (
  gameState,
  action,
) => {
  const { player, tile } = action.payload;
  const playerId = gameState.players.findIndex((p) => p.name === player);
  if (gameState.currentPlayer !== playerId) {
    throw new GameError('Not your turn', GameErrorCodes.GAME_INVALID_ACTION);
  }
  if (gameState.currentPhase !== GamePhase.PLAY_TILE) {
    throw new GameError('Invalid action', GameErrorCodes.GAME_INVALID_ACTION);
  }
  // Domain validation
  playTileValidation(playerId, tile, gameState.tiles);

  return playTileOrchestrator(gameState, action);
};
