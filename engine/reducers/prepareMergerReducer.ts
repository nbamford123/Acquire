import {
  boardTiles,
  calculateShareholderPayouts,
  getHotelByName,
  updateTiles,
} from '../domain/index.ts';

import type { GameState, Hotel, MergeResult, Player, Tile } from '../types/index.ts';

// Do stock payouts and update tiles, plus prepare for next stockholder
export const prepareMergerReducer = (
  players: Player[],
  tiles: Tile[],
  hotels: Hotel[],
  result: Extract<MergeResult, { needsMergeOrder: false }>,
): [Partial<GameState>, string[]] => {
  // pay the majority and minority shareholders
  const [payouts, actions] = calculateShareholderPayouts(
    getHotelByName(hotels, result.mergedHotel),
    boardTiles(tiles),
  );
  actions.concat(
    Array.from(payouts, ([playerId, payout]) => `${players[playerId]} was paid $${payout}`),
  );
  return [{
    mergerTieContext: undefined,
    players: players.map((player) => {
      if (payouts.has(player.id)) {
        return { ...player, money: player.money + (payouts.get(player.id) || 0) };
      } else {
        return player;
      }
    }),
    tiles: updateTiles(tiles, result.survivorTiles),
    mergeContext: {
      stockholderIds: Array.from(payouts, (payout) => payout[0]),
      survivingHotel: result.survivingHotel,
      mergedHotel: result.mergedHotel,
      originalHotels: result.remainingHotels,
      // Remaining tiles have been absorbed into surviving hotel
      additionalTiles: [],
    },
  }, actions];
};
