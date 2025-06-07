import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type Tile,
} from '@/engine/types/index.ts';
import type { FoundHotelAction } from '@/engine/types/actionsTypes.ts';

export const foundHotelReducer = (
  gameState: GameState,
  action: FoundHotelAction,
): GameState => {
  const { playerId, hotelName } = action.payload;
  if (gameState.currentPlayer !== playerId) {
    throw new GameError(
      'Not your turn',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  if (gameState.currentPhase !== GamePhase.FOUND_HOTEL) {
    throw new GameError(
      'Invalid action',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  const newHotel = gameState.hotels.find((h) => h.name === hotelName);
  if (!newHotel) {
    throw new GameError(
      `Hotel ${hotelName} not found in game state`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  if (newHotel.tiles.length !== 0) {
    throw new GameError(
      `Hotel ${hotelName} already exists`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  // Make sure all of the tiles in the found hotel context are actually on the board
  if (!gameState.foundHotelContext) {
    throw new GameError(
      `Can't found hotel ${hotelName}, context missing in state`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  if (gameState.foundHotelContext.tiles.length <= 1) {
    throw new GameError(
      `Can't found hotel ${hotelName}, need at least two tiles`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  if (gameState.foundHotelContext.tiles.some((tile: Tile) => tile.location !== 'board')) {
    throw new GameError(
      `Can't found hotel ${hotelName}, all tile not on board`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  // should we ensure the tiles are all contiguous, don't belong to another hotel, etc.?
  const awardedShare = newHotel.shares.findIndex((share) => share.location === 'bank');
  return {
    ...gameState,
    currentPhase: GamePhase.BUY_SHARES,
    hotels: [
      ...gameState.hotels.map((hotel) =>
        hotel.name === hotelName
          ? {
            ...hotel,
            tiles: [...gameState.foundHotelContext!.tiles],
            shares: hotel.shares.map((share, idx) =>
              idx === awardedShare ? { ...share, location: playerId } : share
            ),
          }
          : hotel
      ),
    ],
    foundHotelContext: undefined,
  };
};
