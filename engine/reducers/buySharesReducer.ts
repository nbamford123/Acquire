import type { GameState, HOTEL_NAME } from '../types/index.ts';
import { boardTiles, sharePrice } from '../domain/index.ts';
export const buySharesReducer = (
  gameState: GameState,
  shares: Record<HOTEL_NAME, number>,
): Partial<GameState> => {
  const board = boardTiles(gameState.tiles);
  // Compute actual number of shares that can be transferred (limited by bank availability)
  const actualTransferred = new Map<HOTEL_NAME, number>();
  const totalCost = gameState.hotels.reduce((cost, hotel) => {
    const requested = shares[hotel.name] || 0;
    if (!requested) return cost;
    const bankCount = hotel.shares.filter((s) => s.location === 'bank').length;
    const actual = Math.min(requested, bankCount);
    actualTransferred.set(hotel.name, actual);
    return cost + actual * sharePrice(hotel.name as HOTEL_NAME, board);
  }, 0);

  return {
    hotels: gameState.hotels.map((hotel) => {
      const numShares = shares[hotel.name];
      if (!numShares) return hotel;
      // Use the actual number we will transfer (may be less than requested)
      let limit = actualTransferred.get(hotel.name) || 0;
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
