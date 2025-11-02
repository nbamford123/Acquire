import type { GameState, HOTEL_NAME } from '../types/index.ts';
import { boardTiles, sharePrice } from '../domain/index.ts';
export const buySharesReducer = (
  gameState: GameState,
  shares: Record<HOTEL_NAME, number>,
): Partial<GameState> => {
  const board = boardTiles(gameState.tiles);
  const totalCost = Object.entries(shares).reduce(
    (cost, [hotelName, numShares]) => cost + numShares * sharePrice(hotelName as HOTEL_NAME, board),
    0,
  );
  return {
    hotels: gameState.hotels.map((hotel) => {
      const numShares = shares[hotel.name];
      if (!numShares) return hotel;
      let limit = numShares;
      return {
        ...hotel,
        shares: hotel.shares.map((share) => {
          if (limit > 0 && share.location === 'bank') {
            limit--;
            return { ...share, location: gameState.currentPlayer };
          } else {
            return share;
          }
        }),
      };
    }),
    players: gameState.players.map((player) =>
      player.id === gameState.currentPlayer
        ? { ...player, money: player.money - totalCost }
        : player
    ),
  };
};
