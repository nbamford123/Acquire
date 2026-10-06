import {
  boardTiles,
  calculateShareholderPayouts,
  getHotelByName,
  getStockHolders,
  hotelTiles,
  updateTiles,
} from '../domain/index.ts';

import type { GameState, Hotel, MergeResult, Player, Tile } from '../types/index.ts';

// Do stock payouts and update tiles, plus prepare for next stockholder
export const prepareMergerReducer = (
  players: Player[],
  tiles: Tile[],
  hotels: Hotel[],
  result: Extract<MergeResult, { needsMergeOrder: false }>,
  currentPlayer: number,
): [Partial<GameState>, string[]] => {
  const gameBoard = boardTiles(tiles);
  const mergedHotel = getHotelByName(hotels, result.mergedHotel);
  // pay the majority and minority shareholders
  const payouts = calculateShareholderPayouts(mergedHotel, gameBoard);
  const playerName = (playerId: number) =>
    players.find((player) => player.id === playerId)?.name ?? `Player ${playerId}`;

  // Every stockholder resolves their shares in turn order, starting with the merging player
  const stockholders = getStockHolders(mergedHotel);
  const start = Math.max(players.findIndex((player) => player.id === currentPlayer), 0);
  const stockholderIds = players
    .map((_, i) => players[(start + i) % players.length].id)
    .filter((playerId) => stockholders.has(playerId));

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
      stockholderIds,
      survivingHotel: result.survivingHotel,
      mergedHotel: result.mergedHotel,
      // Captured before the merged hotel's tiles are absorbed by the survivor
      mergedHotelSize: hotelTiles(result.mergedHotel, gameBoard).length,
      originalHotels: result.remainingHotels,
      // Remaining tiles have been absorbed into surviving hotel
      additionalTiles: [],
    },
  }, Array.from(payouts, ([playerId, payout]) => `${playerName(playerId)} was paid $${payout}`)];
};
