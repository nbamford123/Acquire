import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type PlayTileAction,
} from '../types/index.ts';
import { getTile } from '../domain/index.ts';
import { playTileOrchestrator } from '../orchestrators/playTileOrchestrator.ts';

export const playTileUseCase = (
  gameState: GameState,
  action: PlayTileAction,
): GameState => {
  const { player, tile } = action.payload;
  const playerId = gameState.players.findIndex((p) => p.name === player);
  if (gameState.currentPlayer !== playerId) {
    throw new GameError('Not your turn', GameErrorCodes.GAME_INVALID_ACTION);
  }
  if (gameState.currentPhase !== GamePhase.PLAY_TILE) {
    throw new GameError('Invalid action', GameErrorCodes.GAME_INVALID_ACTION);
  }
  const gameTile = getTile(gameState.tiles, tile.row, tile.col);
  if (!gameTile || gameTile.location !== playerId) {
    throw new GameError('Invalid or not player tile', GameErrorCodes.GAME_INVALID_ACTION);
  }
  return {
    ...gameState,
    ...playTileOrchestrator(tile, gameState.tiles, gameState.players, gameState.hotels),
  };
};
