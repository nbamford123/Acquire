import { getAdjacentPositions, shuffleTiles } from '../utils/index.ts';
import {
  type BoardTile,
  CHARACTER_CODE_A,
  GameError,
  GameErrorCodes,
  type Tile,
} from '../types/index.ts';
import { hotelSafe } from './index.ts';

export const initializeTiles = (rows: number, cols: number): Tile[] =>
  Array.from(
    { length: rows * cols },
    (_, index) => ({
      row: Math.floor(index / cols),
      col: index % cols,
      location: 'bag' as const,
    }),
  );

export const tileLabel = (tile: Tile): string =>
  `${tile.row + 1}${String.fromCharCode(tile.col + CHARACTER_CODE_A)}`;

// Return only the tiles on board
export const boardTiles = (tiles: Tile[]): BoardTile[] =>
  tiles.filter(
    (tile) => tile.location === 'board',
  );

export const deadTile = (tile: Tile, boardTiles: BoardTile[]): boolean => {
  if (tile.location === 'board') {
    throw new GameError(
      `invalid check for dead tile ${tileLabel(tile)}`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  const safeHotels = getAdjacentPositions(tile.row, tile.col)
    .map(([r, c]) => getBoardTile(boardTiles, r, c))
    .filter((tile) => tile && tile.hotel && hotelSafe(tile.hotel, boardTiles));
  return safeHotels.length >= 2;
};

export const updateTiles = (currentTiles: Tile[], tilesToUpdate: Tile[]): Tile[] => {
  const newTiles = [...currentTiles];

  tilesToUpdate.forEach((updatedTile) => {
    const index = newTiles.findIndex((tile) =>
      tile.row === updatedTile.row && tile.col === updatedTile.col
    );
    if (index !== -1) {
      newTiles[index] = updatedTile;
    }
  });

  return newTiles;
};

export const getBoardTile = (tiles: BoardTile[], row: number, col: number) =>
  tiles.find((tile) => tile.row === row && tile.col === col);

export const getTile = (tiles: Tile[], row: number, col: number) =>
  tiles.find((tile) => tile.row === row && tile.col === col);

export const getPlayerTiles = (playerId: number, tiles: Tile[]) =>
  tiles.filter((tile) => tile.location === playerId);

// Will only return the number of tiles left in the bag at most
export const drawTiles = (
  availableTiles: Tile[],
  playerId: number,
  boardTiles: BoardTile[],
  count: number,
): { drawnTiles: Tile[]; deadTiles: Tile[]; remainingTiles: Tile[] } => {
  const shuffled = shuffleTiles([...availableTiles]);
  const drawn: Tile[] = [];
  const dead: Tile[] = [];
  const remaining = [...shuffled];

  while (drawn.length < count && remaining.length > 0) {
    const tile = remaining.shift()!;

    if (deadTile(tile, boardTiles)) {
      dead.push({ ...tile, location: 'dead' });
    } else {
      drawn.push({ ...tile, location: playerId });
    }
  }

  return { drawnTiles: drawn, deadTiles: dead, remainingTiles: remaining };
};
