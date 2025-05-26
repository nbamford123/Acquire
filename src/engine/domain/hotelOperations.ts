import {
  GameError,
  GameErrorCodes,
  type Hotel,
  type HOTEL_NAME,
  type HOTEL_TYPE,
  type Share,
  SharePrices,
  type Tile,
} from '@/engine/types/index.ts';
import { SAFE_HOTEL_SIZE } from '@/engine/config/gameConfig.ts';

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

export const sharePrice = (hotel: Hotel): number => {
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

export const findHotel = (tile: Tile, hotels: Hotel[]) =>
  hotels.find((hotel) => hotel.tiles.includes(tile));

export const hotelSafe = (hotel?: Hotel): boolean =>
  !!hotel && hotel.tiles.length >= SAFE_HOTEL_SIZE;

type TieResolutionResult =
  | { allResolved: true; orderedHotels: Hotel[] }
  | { allResolved: false; hotel1: Hotel; hotel2: Hotel };

const applyTieResolution = (
  hotels: Hotel[],
  resolvedTies?: [string, string][],
): TieResolutionResult => {
  const sorted = [...hotels].sort((a, b) => b.tiles.length - a.tiles.length);

  // Check each adjacent pair for ties
  for (let i = 0; i < sorted.length - 1; i++) {
    const hotel1 = sorted[i];
    const hotel2 = sorted[i + 1];

    if (hotel1.tiles.length === hotel2.tiles.length) {
      // Found a tie - is it resolved?
      const isResolved = resolvedTies &&
        resolvedTies.some(([first, second]) =>
          (first === hotel1.name && second === hotel2.name) ||
          (first === hotel2.name && second === hotel1.name)
        );

      if (!isResolved) {
        return { allResolved: false, hotel1, hotel2 };
      }

      // Apply the resolution by potentially swapping
      const resolution = resolvedTies.find(([first, second]) =>
        (first === hotel1.name && second === hotel2.name) ||
        (first === hotel2.name && second === hotel1.name)
      )!;

      if (resolution[0] === hotel2.name) {
        // Swap them
        [sorted[i], sorted[i + 1]] = [sorted[i + 1], sorted[i]];
      }
    }
  }

  return { allResolved: true, orderedHotels: sorted };
};

type MergeResult =
  | { needsMergeOrder: true; hotel1: Hotel; hotel2: Hotel }
  | {
    needsMergeOrder: false;
    survivingHotel: Hotel;
    mergedHotels: Hotel[];
    mergeActions: string[];
  };

// multiple mergers: the smaller hotels are dealt with one at a time from largest to smallest
// the mergemaker breaks any ties
export const mergeHotels = (
  hotels: Hotel[],
  tile: Tile,
  resolvedTies?: [string, string][],
): MergeResult => {
  if (hotels.length < 2) {
    // reducer shouldn't ever do this
    throw new GameError(
      'Merge  called without at least two hotels',
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }

  // Sort from largest to smallest
  const resolutionResult = applyTieResolution(hotels, resolvedTies);
  if (!resolutionResult.allResolved) {
    return {
      needsMergeOrder: true,
      hotel1: resolutionResult.hotel1,
      hotel2: resolutionResult.hotel2,
    };
  }

  const mergedHotels: Hotel[] = [];
  const mergeActions: string[] = [];
  const [largest, ...toMerge] = resolutionResult.orderedHotels;
  // Add the merger tile to surviving hotel
  const survivingHotel = { ...largest, tiles: [tile, ...largest.tiles] };
  for (const curHotel of toMerge) {
    if (hotelSafe(curHotel)) {
      throw new GameError(
        `Cannot merge safe hotel ${curHotel.name}`,
        GameErrorCodes.GAME_PROCESSING_ERROR,
      );
    }
    survivingHotel.tiles = [...survivingHotel.tiles, ...curHotel.tiles];
    mergedHotels.push({ ...curHotel, tiles: [] });
    mergeActions.push(`${curHotel.name} merges into ${survivingHotel.name}`);
    // should we do this one step at a time and get player results, or do it all at once? That means the player will have to  make all the decisions about stocks in one go
    // Try it this way for now, we can always break it up later if need be.
  }
  return { needsMergeOrder: false, survivingHotel, mergedHotels, mergeActions };
};
