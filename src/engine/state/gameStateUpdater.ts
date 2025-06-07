import {
  GameError,
  GamePhase,
  type GameState,
  type Hotel,
  type HOTEL_NAME,
  Player,
  type Tile,
} from '@/engine/types/index.ts';
import {
  calculateShareholderPayouts,
  majorityMinorityValue,
  mergeHotels,
} from '@/engine/domain/hotelOperations.ts';
import { GameErrorCodes } from '@/engine/types/errorCodes.ts';

export const handleMerger = (
  gameState: GameState,
  hotels: Hotel[],
  additionalTiles: Tile[],
  survivingHotel?: Hotel,
  resolvedTie?: [HOTEL_NAME, HOTEL_NAME],
): Partial<GameState> => {
  const result = mergeHotels(hotels, additionalTiles, survivingHotel, resolvedTie);
  if (result.needsMergeOrder) {
    return {
      currentPhase: GamePhase.BREAK_MERGER_TIE,
      mergerTieContext: {
        tiedHotels: result.tiedHotels,
      },
    };
  }
  // pay the majority and minority shareholders
  const players = gameState.players;
  const { mergedHotel } = result;
  const stockHolders = players.filter((player) => player.shares[mergedHotel]).sort((
    p1,
    p2,
  ) => p2.shares[mergedHotel]! - p1.shares[mergedHotel]!).map((player) => ({
    playerId: player.id,
    stockCount: player.shares[mergedHotel]!,
  }));
  // It's not technically possible for a hotel to be merged with no stockholders, but  ¯\_(ツ)_/¯
  if (stockHolders.length) {
    const hotel = gameState.hotels.find((h) => h.name === mergedHotel);
    if (!hotel) {
      throw new GameError(
        `Invalid merged hotel name ${mergedHotel}`,
        GameErrorCodes.GAME_PROCESSING_ERROR,
      );
    }
    const [majority, minority] = majorityMinorityValue(hotel);
    const payouts = calculateShareholderPayouts(majority, minority, stockHolders);
    // single stockholder gets majority and minority
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
      mergerContext: {
        // Remaining tiles have been absorbed into surviving hotel
        stockholders: stockHolders.map(({ playerId }) => playerId),
        survivingHotel: result.survivingHotel,
        mergedHotel: result.mergedHotel,
        remainingHotels: result.remainingHotels,
      },
    };
  }
  throw new GameError('Invalid merger state', GameErrorCodes.GAME_PROCESSING_ERROR);
};
