import type { BoardTile, HOTEL_NAME } from './index.ts';

export type MergeResult =
  | { needsMergeOrder: true; tiedHotels: HOTEL_NAME[]; mergeContext: MergeContext }
  | {
    needsMergeOrder: false;
    survivingHotel: HOTEL_NAME;
    mergedHotel: HOTEL_NAME;
    remainingHotels: HOTEL_NAME[];
    survivorTiles: BoardTile[];
  };

export interface MergeContext {
  originalHotels: HOTEL_NAME[];
  additionalTiles: BoardTile[];
  survivingHotel?: HOTEL_NAME;
  mergedHotel?: HOTEL_NAME;
  pendingTieBreaker?: {
    tiedHotels: HOTEL_NAME[];
  };
  stockholderIds?: number[];
}

export interface MergeActionPayload {
  context: MergeContext;
  tieResolution?: {
    survivor: HOTEL_NAME;
    merged: HOTEL_NAME;
  };
}

export interface ResolvedTie {
  survivor: HOTEL_NAME;
  merged: HOTEL_NAME;
}
