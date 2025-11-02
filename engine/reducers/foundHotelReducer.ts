import { getHotelByName, getBoardTile, updateTiles, boardTiles } from '../domain/index.ts';
import type {
  BoardTile,
  FoundHotelContext,
  GameState,
  Hotel,
  HOTEL_NAME,
  Tile,
} from '../types/index.ts';

export const foundHotelReducer = (
  playerId: number,
  hotels: Hotel[],
  newHotelName: HOTEL_NAME,
  context: FoundHotelContext,
  tiles: Tile[],
): Partial<GameState> => {
  const newHotel = getHotelByName(hotels, newHotelName);
  const board = boardTiles(tiles);
  const newHotelTiles: BoardTile[] = context.tiles.map((tile) => ({
    ...getBoardTile(board, tile.row, tile.col),
    hotel: newHotelName,
  }));

  const awardedShare = newHotel.shares.findIndex((share) => share.location === 'bank');
  return {
    hotels: [
      ...hotels.map((hotel) =>
        hotel.name === newHotelName
          ? {
            ...hotel,
            shares: hotel.shares.map((share, idx) =>
              idx === awardedShare ? { ...share, location: playerId } : share
            ),
          }
          : hotel
      ),
    ],
    tiles: updateTiles(
      tiles,
      newHotelTiles,
    ),
  };
};
