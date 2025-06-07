import type { HOTEL_NAME, Hotel } from './index.ts';

export type MergeResult =
  | { needsMergeOrder: true; tiedHotels: HOTEL_NAME[] }
  | {
    needsMergeOrder: false;
    survivingHotel: HOTEL_NAME;
    mergedHotel: HOTEL_NAME;
    remainingHotels: HOTEL_NAME[];
  };
