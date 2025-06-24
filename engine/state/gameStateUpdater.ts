import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type Hotel,
  type MergeContext,
  type Player,
  type ResolvedTie,
  type Tile,
} from '@/types/index.ts';
import {
  boardTiles,
  calculateShareholderPayouts,
  majorityMinorityValue,
  mergeHotels,
} from '../domain/index.ts';
import { updateTiles } from '../domain/tileOperations.ts';

export const handleMerger = (
  players: Player[],
  gameTiles: Tile[],
  gameHotels: Hotel[],
  mergeContext: MergeContext,
  resolvedTie?: ResolvedTie,
): Partial<GameState> => {
  const gameBoard = boardTiles(gameTiles);
  const result = mergeHotels(
    mergeContext,
    gameBoard,
    resolvedTie,
  );
  // Found a tie, send back to player for resolution
  if (result.needsMergeOrder) {
    return {
      currentPhase: GamePhase.BREAK_MERGER_TIE,
      mergerTieContext: {
        tiedHotels: result.tiedHotels,
      },
      mergeContext: { ...mergeContext, ...result.mergeContext },
    };
  }

  // pay the majority and minority shareholders
  const merged = gameHotels.find((h) => h.name === result.mergedHotel);
  if (!merged) {
    throw new GameError(
      `Unable to find hotel ${result.mergedHotel}`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  const stockHolders = merged.shares
    .filter((share) => share.location !== 'bank')
    .reduce((acc, share) => {
      const playerId = share.location;
      acc.set(playerId, (acc.get(playerId) || 0) + 1);
      return acc;
    }, new Map());
  const sortedStockHolders = Array.from(stockHolders.entries())
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([playerId, stockCount]) => ({ playerId, stockCount }));

  // It's not technically possible for a hotel to be merged with no stockholders, but  ¯\_(ツ)_/¯
  if (sortedStockHolders.length) {
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
      tiles: updateTiles(gameTiles, result.survivorTiles),
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
