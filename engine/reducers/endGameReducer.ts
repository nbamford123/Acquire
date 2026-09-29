import { type GameState, type Hotel, type PlayerAction } from '../types/index.ts';
import {
  boardTiles,
  calculateShareholderPayouts,
  getStockHolders,
  hotelTiles,
  sharePrice,
} from '../domain/index.ts';

// Final scoring: pay bonuses for every hotel on the board, then sell all shares in those hotels.
// Shares in hotels that aren't on the board are worthless.
export const endGameReducer = (
  gameState: GameState,
): [Pick<GameState, 'players' | 'hotels'>, PlayerAction[]] => {
  const { players, tiles } = gameState;
  const gameBoard = boardTiles(tiles);
  const playerName = (playerId: number) =>
    players.find((player) => player.id === playerId)?.name ?? `Player ${playerId}`;
  // Find all active hotels (size > 0)
  // Sort by size in descending order;
  const activeHotels = gameState.hotels.reduce((hotels, hotel) => {
    const hotelSize = hotelTiles(hotel.name, gameBoard).length;
    if (hotelSize > 0) {
      return hotels.concat([[hotel, hotelSize]]);
    }
    return hotels;
  }, [] as [Hotel, number][]).sort((a, b) => b[1] - a[1]);

  const income: Map<number, number> = new Map();
  const addIncome = (playerId: number, amount: number) =>
    income.set(playerId, amount + (income.get(playerId) || 0));
  const actions: string[] = [];
  for (const [hotel] of activeHotels) {
    const [payouts, payoutActions] = calculateShareholderPayouts(hotel, gameBoard);
    actions.push(...payoutActions);
    payouts.forEach((payout, playerId) => {
      addIncome(playerId, payout);
      actions.push(`${playerName(playerId)} was paid $${payout} for ${hotel.name}`);
    });
    const price = sharePrice(hotel.name, gameBoard);
    getStockHolders(hotel).forEach((count, playerId) => {
      addIncome(playerId, count * price);
      actions.push(
        `${playerName(playerId)} sold ${count} shares of ${hotel.name} for $${count * price}`,
      );
    });
  }

  const finalPlayers = players.map((player) => ({
    ...player,
    money: player.money + (income.get(player.id) || 0),
  }));
  [...finalPlayers]
    .sort((a, b) => b.money - a.money)
    .forEach((player) => actions.push(`${player.name} finished with $${player.money}`));

  const soldHotels = new Set(activeHotels.map(([hotel]) => hotel.name));
  return [{
    players: finalPlayers,
    hotels: gameState.hotels.map((hotel) =>
      soldHotels.has(hotel.name)
        ? { ...hotel, shares: hotel.shares.map(() => ({ location: 'bank' as const })) }
        : hotel
    ),
  }, actions.map((action) => ({ turn: gameState.currentTurn, action }))];
};
