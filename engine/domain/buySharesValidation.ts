import {
  type BoardTile,
  GameError,
  GameErrorCodes,
  type Hotel,
  type HOTEL_NAME,
  type Player,
} from '../types/index.ts';
import { remainingShares, sharePrice } from '../domain/index.ts';

export const buySharesValidation = (
  player: Player,
  shares: Record<HOTEL_NAME, number>,
  board: BoardTile[],
  hotels: Hotel[],
): void => {
  if (Object.values(shares).reduce((total, numShares) => total + numShares, 0) > 3) {
    throw new GameError(
      'Only 3 shares may be purchased per turn',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  let totalCost = 0;
  Object.entries(shares).forEach(([hotelName, numShares]) => {
    if (numShares === 0) {
      throw new GameError(
        `Can't buy zero shares in hotel ${hotelName}`,
        GameErrorCodes.GAME_INVALID_ACTION,
      );
    }
    const hotel = hotels.find((h) => h.name === hotelName);
    if (!hotel) {
      throw new GameError(`Hotel ${hotelName} doesn't exist`, GameErrorCodes.GAME_INVALID_ACTION);
    }
    if (remainingShares(hotel) < numShares) {
      throw new GameError(
        `Hotel ${hotelName} doesn't have enough shares`,
        GameErrorCodes.GAME_INVALID_ACTION,
      );
    }
    totalCost += sharePrice(hotel.name, board) * numShares;
  });
  if (player.money < totalCost) {
    throw new GameError(
      `You need $${totalCost} to purchase these shares and you only have $${player.money}`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
};
