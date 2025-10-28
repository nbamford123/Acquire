import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type Hotel,
  type MergeResult,
  type Player,
  type Tile,
} from '../types/index.ts';
import {
  boardTiles,
  calculateShareholderPayouts,
  majorityMinorityValue,
  updateTiles,
} from '../domain/index.ts';
import { getStockHolders } from '../domain/hotelOperations.ts';

// Do stock payouts and update tiles, plus prepare for next stockholder
export const prepareMergerReducer = (
  players: Player[],
  tiles: Tile[],
  hotels: Hotel[],
  result: Extract<MergeResult, { needsMergeOrder: false }>,
): Partial<GameState> => {
  // pay the majority and minority shareholders
  const merged = hotels.find((h) => h.name === result.mergedHotel);
  if (!merged) {
    throw new GameError(
      `Unable to find hotel ${result.mergedHotel}`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  const stockHolders = getStockHolders(merged);
  const sortedStockHolders = Array.from(stockHolders.entries())
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([playerId, stockCount]) => ({ playerId, stockCount }));

  // It's not technically possible for a hotel to be merged with no stockholders, but  ¯\_(ツ)_/¯
  if (sortedStockHolders.length) {
    const gameBoard = boardTiles(tiles);
    const [majority, minority] = majorityMinorityValue(merged, gameBoard);
    const payouts = calculateShareholderPayouts(majority, minority, sortedStockHolders);
    return {
      currentPhase: GamePhase.RESOLVE_MERGER,
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
  }
  throw new GameError('Invalid merger state', GameErrorCodes.GAME_PROCESSING_ERROR);
};
