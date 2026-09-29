import type { HOTEL_NAME, Tile } from '@acquire/engine/types';
import { getAdjacentPositions } from '../utils/getAdjacentPositions.ts';
import { boardTiles, getAvailableHotelNames, getTile, hotelSafe } from './index.ts';

export const analyzeTilePlacement = (tile: Tile, tiles: Tile[]) => {
  const adjacentTiles = getAdjacentPositions(tile.row, tile.col).map(([r, c]) =>
    getTile(tiles, r, c)
  ).filter(
    (tile): tile is Tile & { location: 'board'; hotel?: HOTEL_NAME } =>
      tile ? tile.location === 'board' : false,
  );
  // A tile can touch the same hotel on more than one side
  const adjacentHotels = [
    ...new Set(adjacentTiles.flatMap((tile) => tile.hotel ? [tile.hotel] : [])),
  ];
  const availableHotels = getAvailableHotelNames(boardTiles(tiles));

  const triggersMerger = adjacentHotels.length >= 2;
  const foundsHotel = adjacentHotels.length === 0 && adjacentTiles.length >= 1 &&
    availableHotels.length;
  const growsHotel = adjacentHotels.length === 1;
  const simplePlacement = !triggersMerger && !foundsHotel && !growsHotel;
  // Tiles that don't belong to a hotel
  const additionalTiles = adjacentTiles.filter((tile) => !tile.hotel);
  return {
    tile,
    triggersMerger,
    foundsHotel,
    growsHotel,
    simplePlacement,
    adjacentHotels,
    adjacentTiles,
    additionalTiles,
  };
};

// Why a tile can't be played, or undefined if it can: it would merge two safe hotels (never
// playable), or found a hotel when all of them are on the board (playable once one is merged away)
export const unplayableReason = (
  tile: { row: number; col: number },
  tiles: Tile[],
): string | undefined => {
  const { adjacentHotels, adjacentTiles } = analyzeTilePlacement(
    { ...tile, location: 'board' },
    tiles,
  );
  const board = boardTiles(tiles);
  if (adjacentHotels.filter((hotel) => hotelSafe(hotel, board)).length >= 2) {
    return 'it would merge two safe hotels';
  }
  if (
    !adjacentHotels.length && adjacentTiles.length && !getAvailableHotelNames(board).length
  ) {
    return 'all hotels are already on the board';
  }
  return undefined;
};
