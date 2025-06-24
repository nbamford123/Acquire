import {
  type BoardTile,
  GameError,
  GameErrorCodes,
  type HOTEL_NAME,
  type MergeContext,
  type MergeResult,
  ResolvedTie,
} from '@/types/index.ts';
import { getTiedHotels, hotelSafe, hotelTiles } from '../domain/index.ts';

export const mergeHotels = (
  mergeContext: MergeContext,
  gameBoard: BoardTile[],
  tieResolution?: ResolvedTie,
): MergeResult => {
  if (mergeContext.originalHotels.length < 2) {
    throw new GameError('Need at least 2 hotels to merge', GameErrorCodes.GAME_PROCESSING_ERROR);
  }

  const sortedHotels = [...mergeContext.originalHotels].sort((a, b) =>
    hotelTiles(b, gameBoard).length - hotelTiles(a, gameBoard).length
  );

  let survivor: HOTEL_NAME;
  let merged: HOTEL_NAME;
  let remainingHotels: HOTEL_NAME[];

  if (tieResolution) {
    // User provided tie resolution-- we always know survivor and merged
    if (
      !sortedHotels.includes(tieResolution.survivor) || !sortedHotels.includes(tieResolution.merged)
    ) {
      throw new GameError(
        'Tie resolution contains invalid hotels',
        GameErrorCodes.GAME_INVALID_ACTION,
      );
    }
    if (mergeContext.survivingHotel) {
      // Survivor is previous survivor in this case, we want to merge in the hotel the user picked as "survivor"
      survivor = mergeContext.survivingHotel;
      merged = tieResolution.survivor;
      // Remove the merged hotel from the sorted list to get remaining hotels
      remainingHotels = sortedHotels.filter((h) => h !== merged);
    } else {
      survivor = tieResolution.survivor;
      merged = tieResolution.merged;
      // Remove both survivor and merged from the sorted list to get remaining hotels
      remainingHotels = sortedHotels.filter((h) => h !== survivor && h !== merged);
    }
  } else {
    // Initial merge - determine both survivor and merged
    if (
      sortedHotels.length >= 2 &&
      hotelTiles(sortedHotels[0], gameBoard).length ===
        hotelTiles(sortedHotels[1], gameBoard).length
    ) {
      // need to pick survivor and merged
      return {
        needsMergeOrder: true,
        tiedHotels: getTiedHotels(sortedHotels[0], sortedHotels, gameBoard),
        mergeContext,
      };
    } else {
      survivor = sortedHotels.shift()!;
      if (
        sortedHotels.length >= 2 &&
        hotelTiles(sortedHotels[0], gameBoard).length ===
          hotelTiles(sortedHotels[1], gameBoard).length
      ) {
        // survivor okay, but need to pick merged
        return {
          needsMergeOrder: true,
          tiedHotels: getTiedHotels(sortedHotels[0], sortedHotels, gameBoard),
          mergeContext: {
            ...mergeContext,
            survivingHotel: survivor,
            originalHotels: [...sortedHotels],
          },
        };
      } else {
        merged = sortedHotels.shift()!;
        remainingHotels = sortedHotels;
      }
    }
  }

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
    ...mergeContext.additionalTiles,
  ];
  return {
    needsMergeOrder: false,
    survivingHotel: survivor,
    mergedHotel: merged,
    remainingHotels,
    survivorTiles,
  };
};
