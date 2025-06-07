import {
  GameError,
  GameErrorCodes,
  type Hotel,
  type HOTEL_NAME,
  type HOTEL_TYPE,
  type MergeResult,
  type Share,
  SharePrices,
  type Tile,
} from '@/engine/types/index.ts';
import { SAFE_HOTEL_SIZE } from '@/engine/config/gameConfig.ts';
import { roundUpToNearestHundred } from '@/engine/utils/index.ts';

const initializeShares = (): Share[] => Array.from({ length: 25 }, () => ({ location: 'bank' }));

const initializeHotel = (name: HOTEL_NAME, type: HOTEL_TYPE): Hotel => ({
  name: name,
  type: type,
  shares: initializeShares(),
  tiles: [],
});

export const initializeHotels = (): Hotel[] => [
  initializeHotel('Worldwide', 'economy'),
  initializeHotel('Sackson', 'economy'),
  initializeHotel('Festival', 'standard'),
  initializeHotel('Imperial', 'standard'),
  initializeHotel('American', 'standard'),
  initializeHotel('Continental', 'luxury'),
  initializeHotel('Tower', 'luxury'),
];

export const remainingShares = (hotel: Hotel) =>
  hotel.shares.filter((s) => s.location === 'bank').length;

export const getAvailableShares = (hotel: Hotel) =>
  hotel.shares.filter((s) => s.location === 'bank');

const findCurrentHotelPrice = (hotel: Hotel) => {
  const size = hotel.tiles.length;
  const prices = SharePrices[hotel.type];
  for (const [bracket, price] of Object.entries(prices)) {
    if (size <= Number(bracket)) {
      return price;
    }
  }
  throw new GameError(
    'No price bracket found - check SharePrices configuration',
    GameErrorCodes.GAME_PROCESSING_ERROR,
  );
};
export const sharePrice = (hotel: Hotel): number => findCurrentHotelPrice(hotel).price;

export const majorityMinorityValue = (hotel: Hotel) => {
  const price = findCurrentHotelPrice(hotel);
  return [price.majority, price.minority];
};

export const findHotel = (tile: Tile | undefined, hotels: Hotel[]) =>
  tile ? hotels.find((hotel) => hotel.tiles.includes(tile)) : undefined;

export const hotelSafe = (hotel?: Hotel): boolean =>
  !!hotel && hotel.tiles.length >= SAFE_HOTEL_SIZE;

const getTiedHotels = (hotel: Hotel, hotels: Hotel[]): HOTEL_NAME[] =>
  hotels.filter((h) => h.tiles.length === hotel.tiles.length).map((h) => h.name);

export const mergeHotels = (
  hotels: Hotel[],
  additionalTiles: Tile[],
  survivingHotel?: Hotel,
  resolvedTie?: [HOTEL_NAME, HOTEL_NAME],
): MergeResult => {
  if (hotels.length < 2) {
    throw new GameError('Need at least 2 hotels to merge', GameErrorCodes.GAME_PROCESSING_ERROR);
  }

  const sortedHotels = [...hotels].sort((a, b) => b.tiles.length - a.tiles.length);

  let survivor: Hotel;
  let merged: Hotel;

  if (survivingHotel) {
    // Subsequent merge: survivingHotel is already determined
    survivor = survivingHotel;

    if (resolvedTie) {
      // Use resolved tie to determine which hotel to merge next
      // In this case, resolvedTie[0] should be the hotel to merge (since survivor is already determined)
      const mergedHotel = hotels.find((h) => h.name === resolvedTie[0] && h.name !== survivor.name);
      if (!mergedHotel) {
        throw new GameError(
          "Couldn't find hotel from resolved tie",
          GameErrorCodes.GAME_PROCESSING_ERROR,
        );
      }
      merged = mergedHotel;
    } else {
      // No tie resolution needed, pick the largest remaining hotel
      merged = sortedHotels[0];
    }
  } else {
    // Initial merge: determine survivor and merged from scratch
    if (resolvedTie) {
      // Use resolved tie: [survivor, merged]
      const survivorHotel = hotels.find((h) => h.name === resolvedTie[0]);
      const mergedHotel = hotels.find((h) => h.name === resolvedTie[1]);

      if (!survivorHotel || !mergedHotel) {
        throw new GameError(
          "Couldn't find hotels from resolved tie",
          GameErrorCodes.GAME_PROCESSING_ERROR,
        );
      }

      survivor = survivorHotel;
      merged = mergedHotel;
    } else {
      // Default case: largest survives, second largest gets merged
      survivor = sortedHotels[0];
      merged = sortedHotels[1];
    }
  }

  const remainingHotels = sortedHotels.filter((h) =>
    h.name !== survivor.name && h.name !== merged.name
  );

  // Check for ties that need resolving (only if no tie was already resolved)
  if (!resolvedTie) {
    if (survivor.tiles.length === merged.tiles.length) {
      // Tie between survivor and merged
      const tiedHotels = getTiedHotels(merged, sortedHotels);
      return { needsMergeOrder: true, tiedHotels: tiedHotels };
    }
  }

  // Check for additional ties among remaining hotels with the merged hotel
  const tiedWithMerged = remainingHotels.filter((h) => h.tiles.length === merged.tiles.length);
  if (tiedWithMerged.length > 0) {
    return {
      needsMergeOrder: true,
      tiedHotels: [merged.name, ...tiedWithMerged.map((h) => h.name)],
    };
  }

  if (hotelSafe(merged)) {
    throw new GameError(
      `Cannot merge safe hotel ${merged.name}`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  return {
    needsMergeOrder: false,
    survivingHotel: survivor.name,
    mergedHotel: merged.name,
    // additional tiles because we're not actually going to merge until end of resolve merger phase
    remainingHotels: remainingHotels.map((h) => h.name),
  };
};

// playerStockCounts is assumed to be sorted in descending order
// returns an array of payouts indexed by player id
export const calculateShareholderPayouts = (
  majorityBonus: number,
  minorityBonus: number,
  playerStockCounts: { stockCount: number; playerId: number }[],
) => {
  const payouts: Record<number, number> = {};

  // Group players by stock count to handle ties
  const stockGroups = [];
  let currentGroup = [playerStockCounts[0]];

  for (let i = 1; i < playerStockCounts.length; i++) {
    if (playerStockCounts[i].stockCount === currentGroup[0].stockCount) {
      currentGroup.push(playerStockCounts[i]);
    } else {
      stockGroups.push(currentGroup);
      currentGroup = [playerStockCounts[i]];
    }
  }
  stockGroups.push(currentGroup);

  if (stockGroups.length === 1) {
    // Everyone tied - split both bonuses among all players
    const totalBonus = majorityBonus + minorityBonus;
    const perPlayer = roundUpToNearestHundred(totalBonus / stockGroups[0].length);
    stockGroups[0].forEach(({ playerId }) => {
      payouts[playerId] = perPlayer;
    });
  } else if (stockGroups[0].length > 1) {
    // Tie for majority - combine and split majority + minority among tied players
    const totalBonus = majorityBonus + minorityBonus;
    const perPlayer = roundUpToNearestHundred(totalBonus / stockGroups[0].length);
    stockGroups[0].forEach(({ playerId }) => {
      payouts[playerId] = perPlayer;
    });
    // No minority bonus paid to anyone else
  } else {
    // No tie for majority - single majority winner
    payouts[stockGroups[0][0].playerId] = majorityBonus;

    if (stockGroups.length > 1) {
      // Handle minority shareholders
      if (stockGroups[1].length > 1) {
        // Tie for minority - split minority bonus
        const perPlayer = roundUpToNearestHundred(minorityBonus / stockGroups[1].length);
        stockGroups[1].forEach(({ playerId }) => {
          payouts[playerId] = perPlayer;
        });
      } else {
        // Single minority winner
        payouts[stockGroups[1][0].playerId] = minorityBonus;
      }
    }
  }

  return payouts;
};
