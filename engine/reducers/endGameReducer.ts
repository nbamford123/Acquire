import { type GameState, type Hotel, type PlayerAction } from '../types/index.ts';
import { boardTiles, calculateShareholderPayouts, hotelTiles } from '../domain/index.ts';

export const endGameReducer = (
  gameState: GameState,
): [Partial<GameState>, PlayerAction[]] => {
  const { players, tiles } = gameState;
  const gameBoard = boardTiles(tiles);
  // Find all active hotels (size > 0)
  // Sort by size in descending order;
  const activeHotels = gameState.hotels.reduce((hotels, hotel) => {
    const hotelSize = hotelTiles(hotel.name, gameBoard).length;
    if (hotelSize > 0) {
      return hotels.concat([[hotel, hotelSize]]);
    }
    return hotels;
  }, [] as [Hotel, number][]).sort((a, b) => b[1] - a[1]);
  const playerPayouts: Map<number, number> = new Map();
  const actions: string[] = [];
  for (const hotelInfo of activeHotels) {
    const [payouts, payoutActions] = calculateShareholderPayouts(hotelInfo[0], gameBoard);
    actions.concat(payoutActions);
    payouts.forEach((payout, playerId) => {
      playerPayouts.set(playerId, payout + (playerPayouts.get(playerId) || 0));
      actions.push(`${players[playerId]} was paid $${payout}`);
    });
  }

  return [{
    players: gameState.players.map((player) => ({
      ...player,
      money: player.money + (playerPayouts.get(player.id) || 0),
    })),
  }, actions.map((action) => ({ turn: gameState.currentTurn, action }))];
};
