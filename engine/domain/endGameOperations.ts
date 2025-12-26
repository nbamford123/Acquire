import {
  type BoardTile,
  END_GAME_HOTEL_SIZE,
  type Hotel,
  SAFE_HOTEL_SIZE,
} from '../types/index.ts';
import { hotelTiles } from './hotelOperations.ts';

// Check for end game state (single hotel >= 41 tiles or all hotels are safe)
export const gameOver = (board: BoardTile[], hotels: Hotel[]) =>
  hotels.length > 0 && (
    (hotels.some((hotel) => hotelTiles(hotel.name, board).length >= SAFE_HOTEL_SIZE)) ||
    (hotels.every((hotel) => hotelTiles(hotel.name, board).length >= END_GAME_HOTEL_SIZE))
  );
