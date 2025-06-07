import { getAdjacentPositions, shuffleTiles } from '@/engine/utils/index.ts';
import { GameError, GameState, type Tile } from '@/engine/types/index.ts';
import { findHotel, hotelSafe } from './index.ts';
import { CHARACTER_CODE_A, COLS, ROWS } from '@/engine/config/gameConfig.ts';
import { GameErrorCodes } from '@/engine/types/errorCodes.ts';

export const initializeTiles = (rows: number, cols: number): Tile[][] =>
  Array.from(
    { length: rows },
    (_, row) =>
      Array.from(
        { length: cols },
        (_, col) => ({
          row: row,
          col: col,
          location: 'bag',
        }),
      ),
  );

export const tileLabel = (tile: Tile): string =>
  `${tile.row + 1}${String.fromCharCode(tile.col + CHARACTER_CODE_A)}`;

export const board = (tiles: Tile[][]): Array<Array<Tile | undefined>> =>
  tiles.map((row) => row.map((tile) => tile.location === 'board' ? tile : undefined));

export const deadTile = (tile: Tile, gameState: GameState): boolean => {
  if (tile.location === 'board') {
    throw new GameError(
      `invalid check for dead tile ${tileLabel(tile)}`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  const gameBoard = board(gameState.tiles);
  const hotels = gameState.hotels;
  const safeHotels = getAdjacentPositions(tile.row, tile.col)
    .map(([r, c]) => findHotel(gameBoard[r][c], hotels))
    .filter((hotel) => hotelSafe(hotel)).length;
  return safeHotels >= 2;
};

// Will only return the number of tiles left in the bag at most
export const drawTiles = (
  gameState: GameState,
  playerId: number,
  count: number,
): Tile[] => {
  const drawTilesInternal = (
    tiles: Tile[],
    playerId: number,
    count: number,
  ): Tile[] => {
    if (count <= 0) return [];

    const tile = tiles.shift();
    if (!tile) return [];
    if (deadTile(tile, gameState)) {
      tile.location = 'dead';
      return drawTilesInternal(tiles, playerId, count);
    }
    tile.location = playerId;
    return [tile, ...drawTilesInternal(tiles, playerId, count - 1)];
  };
  const returnTiles = [...gameState.tiles];
  const availableTiles = returnTiles.flat().filter((tile) => tile.location === 'bag');
  const randomizedTiles = shuffleTiles(availableTiles);
  return drawTilesInternal(randomizedTiles, playerId, count);
};

export const replaceTile = (tiles: Tile[][], tile: Tile): Tile[][] =>
  tiles.map((row, rowIndex) =>
    rowIndex === tile.row
      ? row.map((existingTile, colIndex) => colIndex === tile.col ? tile : existingTile)
      : row
  );
