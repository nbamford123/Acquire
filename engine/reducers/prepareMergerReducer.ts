import {
  boardTiles,
  calculateShareholderPayouts,
  getHotelByName,
  getStockHolders,
  majorityMinorityValue,
  updateTiles,
} from '../domain/index.ts';
import { getStockholderMap } from '../utils/index.ts';

import {
  type GameState,
  type Hotel,
  type MergeResult,
  type Player,
  type Tile,
} from '../types/index.ts';

// Do stock payouts and update tiles, plus prepare for next stockholder
export const prepareMergerReducer = (
  players: Player[],
  tiles: Tile[],
  hotels: Hotel[],
  result: Extract<MergeResult, { needsMergeOrder: false }>,
): Partial<GameState> => {
  // pay the majority and minority shareholders
  const merged = getHotelByName(hotels, result.mergedHotel);
  const stockholders = getStockHolders(merged);
  const sortedStockHolders = getStockholderMap(stockholders);
  const gameBoard = boardTiles(tiles);
  const [majority, minority] = majorityMinorityValue(merged, gameBoard);
  const payouts = calculateShareholderPayouts(majority, minority, sortedStockHolders);

  return {
    mergerTieContext: undefined,
    players: players.map((player) => {
      if (payouts[player.id]) {
        return { ...player, money: player.money + payouts[player.id] };
      } else {
        return player;
      }
    }),
    tiles: updateTiles(tiles, result.survivorTiles),
    mergeContext: {
      stockholderIds: sortedStockHolders.map(({ playerId }) => playerId),
      survivingHotel: result.survivingHotel,
      mergedHotel: result.mergedHotel,
      originalHotels: result.remainingHotels,
      // Remaining tiles have been absorbed into surviving hotel
      additionalTiles: [],
    },
  };
};
