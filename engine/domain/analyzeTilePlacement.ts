import type { HOTEL_NAME, Tile } from '@acquire/engine/types';
import { getAdjacentPositions } from '../utils/getAdjacentPositions.ts';
import { boardTiles, getAvailableHotelNames, getTile } from './index.ts';

export const analyzeTilePlacement = (tile: Tile, tiles: Tile[]) => {
  const adjacentTiles = getAdjacentPositions(tile.row, tile.col).map(([r, c]) =>
    getTile(tiles, r, c)
  ).filter(
    (tile): tile is Tile & { location: 'board'; hotel?: HOTEL_NAME } =>
      tile ? tile.location === 'board' : false,
  );
  const adjacentHotels = adjacentTiles
    .flatMap((tile) => tile.hotel ? [tile.hotel] : []);
  const availableHotels = getAvailableHotelNames(boardTiles(tiles));

  const triggersMerger = adjacentHotels.length >= 2;
  console.log({adjacentHotels, adjacentTiles, availableHotels})
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
