import {
  type BoardTile,
  END_GAME_HOTEL_SIZE,
  type Hotel,
  SAFE_HOTEL_SIZE,
} from '../types/index.ts';
import { hotelTiles } from './hotelOperations.ts';

// Game ends when any hotel has 41+ tiles, or every hotel on the board is safe
export const gameOver = (board: BoardTile[], hotels: Hotel[]) => {
  const activeSizes = hotels
    .map((hotel) => hotelTiles(hotel.name, board).length)
    .filter((size) => size > 0);
  return activeSizes.length > 0 && (
    activeSizes.some((size) => size >= END_GAME_HOTEL_SIZE) ||
    activeSizes.every((size) => size >= SAFE_HOTEL_SIZE)
  );
};
