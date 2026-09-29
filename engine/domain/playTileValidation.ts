import { GameError, GameErrorCodes, type Tile } from '../types/index.ts';
import { getTile, unplayableReason } from '../domain/index.ts';
import { getTileLabel } from '../utils/index.ts';

export const playTileValidation = (
  playerId: number,
  tile: { row: number; col: number },
  tiles: Tile[],
): void => {
  const gameTile = getTile(tiles, tile.row, tile.col);
  if (!gameTile || gameTile.location !== playerId) {
    throw new GameError('Invalid or not player tile', GameErrorCodes.GAME_INVALID_ACTION);
  }
  const reason = unplayableReason(tile, tiles);
  if (reason) {
    throw new GameError(
      `${getTileLabel(tile)} can't be played: ${reason}`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
};
