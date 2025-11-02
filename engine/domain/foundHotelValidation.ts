import {
  type FoundHotelContext,
  GameError,
  GameErrorCodes,
  type Hotel,
  type HOTEL_NAME,
  type Tile,
} from '../types/index.ts';
import { boardTiles, getBoardTile, hotelTiles } from '../domain/index.ts';

export const foundHotelValidation = (
  context: FoundHotelContext | undefined,
  hotelName: HOTEL_NAME,
  hotels: Hotel[],
  tiles: Tile[],
): void => {
  const newHotel = hotels.find((h) => h.name === hotelName);
  if (!newHotel) {
    throw new GameError(
      `Hotel ${hotelName} not found in game state`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  const board = boardTiles(tiles);
  if (hotelTiles(hotelName, board).length !== 0) {
    throw new GameError(
      `Hotel ${hotelName} already exists`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  // Are we overloading foundHotelContext? It's sent to the client *and* used for the found hotel action?
  // I guess it works
  // Make sure all of the tiles in the found hotel context are actually on the board
  if (!context) {
    throw new GameError(
      `Can't found hotel ${hotelName}, context missing in state`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  if (context.tiles.length <= 1) {
    throw new GameError(
      `Can't found hotel ${hotelName}, need at least two tiles`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  const contextTiles = context.tiles.map((tile) => getBoardTile(board, tile.row, tile.col));
  if (contextTiles.some((tile) => tile === undefined || tile.location !== 'board')) {
    throw new GameError(
      'Invalid tiles in found hotel context',
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
};
