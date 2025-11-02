import { GameError, GameErrorCodes, type Tile } from '../types/index.ts';
import { getTile } from '../domain/index.ts';

export const playTileValidation = (
  playerId: number,
  tile: { row: number; col: number },
  tiles: Tile[],
): void => {
  const gameTile = getTile(tiles, tile.row, tile.col);
  if (!gameTile || gameTile.location !== playerId) {
    throw new GameError('Invalid or not player tile', GameErrorCodes.GAME_INVALID_ACTION);
  }
};
