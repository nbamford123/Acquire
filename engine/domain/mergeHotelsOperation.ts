import {
  type BoardTile,
  GameError,
  GameErrorCodes,
  type HOTEL_NAME,
  type MergeContext,
  type MergeResult,
  ResolvedTie,
} from '../types/index.ts';
import { getTiedHotels, hotelSafe, hotelTiles } from './hotelOperations.ts';

// Hotels tied for the largest size; expects hotels sorted by size descending
const largestHotels = (hotels: HOTEL_NAME[], gameBoard: BoardTile[]): HOTEL_NAME[] =>
  hotels.length ? getTiedHotels(hotels[0], hotels, gameBoard) : [];

const invalidTieResolution = () =>
  new GameError('Tie resolution contains invalid hotels', GameErrorCodes.GAME_INVALID_ACTION);

export const mergeHotels = (
  mergeContext: MergeContext,
  gameBoard: BoardTile[],
  tieResolution?: ResolvedTie,
): MergeResult => {
  const { survivingHotel } = mergeContext;
  // Once a survivor has been picked, originalHotels only holds the hotels still to merge into it
  const candidates = [...mergeContext.originalHotels]
    .filter((hotel) => hotel !== survivingHotel)
    .sort((a, b) => hotelTiles(b, gameBoard).length - hotelTiles(a, gameBoard).length);
  if (candidates.length < (survivingHotel ? 1 : 2)) {
    throw new GameError('Need at least 2 hotels to merge', GameErrorCodes.GAME_PROCESSING_ERROR);
  }

  let survivor = survivingHotel;
  if (!survivor) {
    const largest = largestHotels(candidates, gameBoard);
    if (largest.length === 1) {
      survivor = largest[0];
    } else if (!tieResolution) {
      // need to pick survivor and merged
      return { needsMergeOrder: true, tiedHotels: largest, mergeContext };
    } else if (largest.includes(tieResolution.survivor)) {
      survivor = tieResolution.survivor;
    } else {
      throw invalidTieResolution();
    }
  } else if (tieResolution && tieResolution.survivor !== survivor) {
    throw invalidTieResolution();
  }

  const mergeable = candidates.filter((hotel) => hotel !== survivor);
  const nextLargest = largestHotels(mergeable, gameBoard);
  let merged: HOTEL_NAME;
  if (tieResolution) {
    // The merged hotel must be one of the largest remaining hotels
    if (!nextLargest.includes(tieResolution.merged)) {
      throw invalidTieResolution();
    }
    merged = tieResolution.merged;
  } else if (nextLargest.length === 1) {
    merged = nextLargest[0];
  } else {
    // survivor okay, but need to pick merged
    return {
      needsMergeOrder: true,
      tiedHotels: nextLargest,
      mergeContext: { ...mergeContext, survivingHotel: survivor, originalHotels: mergeable },
    };
  }
  const remainingHotels = mergeable.filter((hotel) => hotel !== merged);

  // Validate the merge is legal
  if (hotelSafe(merged, gameBoard)) {
    throw new GameError(
      `Cannot merge safe hotel ${merged}`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  // Execute the merge
  const survivorTiles = [
    ...hotelTiles(survivor, gameBoard),
    ...hotelTiles(merged, gameBoard).map((tile) => ({ ...tile, hotel: survivor })),
    ...mergeContext.additionalTiles.map((tile) => ({ ...tile, hotel: survivor })),
  ];
  return {
    needsMergeOrder: false,
    survivingHotel: survivor,
    mergedHotel: merged,
    remainingHotels,
    survivorTiles,
  };
};
