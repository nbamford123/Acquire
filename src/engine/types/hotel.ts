import type { Share, Tile } from './index.ts';

export type HOTEL_NAME =
  | 'Worldwide'
  | 'Sackson'
  | 'Festival'
  | 'Imperial'
  | 'American'
  | 'Continental'
  | 'Tower';

export type HOTEL_TYPE = 'economy' | 'standard' | 'luxury';
export type Hotel = {
  name: HOTEL_NAME;
  type: HOTEL_TYPE;
  shares: Share[];
  tiles: Tile[];
};

export const SharePrices: Record<HOTEL_TYPE, Record<number, number>> = {
  economy: {
    2: 200,
    3: 300,
    4: 400,
    5: 500,
    10: 600,
    20: 700,
    30: 800,
    40: 900,
    [Number.MAX_SAFE_INTEGER]: 1000,
  },
  standard: {
    2: 300,
    3: 400,
    4: 500,
    5: 600,
    10: 700,
    20: 800,
    30: 900,
    40: 1000,
    [Number.MAX_SAFE_INTEGER]: 1100,
  },
  luxury: {
    2: 400,
    3: 500,
    4: 600,
    5: 700,
    10: 800,
    20: 900,
    30: 1000,
    40: 1100,
    [Number.MAX_SAFE_INTEGER]: 1200,
  },
};
