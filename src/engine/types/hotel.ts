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
};

export const SharePrices: Record<
  HOTEL_TYPE,
  Record<number, { price: number; majority: number; minority: number }>
> = {
  economy: {
    2: { price: 200, majority: 2000, minority: 1000 },
    3: { price: 300, majority: 3000, minority: 1500 },
    4: { price: 400, majority: 4000, minority: 2000 },
    5: { price: 500, majority: 5000, minority: 2500 },
    10: { price: 600, majority: 6000, minority: 3000 },
    20: { price: 700, majority: 7000, minority: 3500 },
    30: { price: 800, majority: 8000, minority: 4000 },
    40: { price: 900, majority: 9000, minority: 4500 },
    [Number.MAX_SAFE_INTEGER]: { price: 1000, majority: 10000, minority: 5000 },
  },
  standard: {
    2: { price: 300, majority: 3000, minority: 1500 },
    3: { price: 400, majority: 4000, minority: 2000 },
    4: { price: 500, majority: 5000, minority: 2500 },
    5: { price: 600, majority: 6000, minority: 3000 },
    10: { price: 700, majority: 7000, minority: 3500 },
    20: { price: 800, majority: 8000, minority: 4000 },
    30: { price: 900, majority: 9000, minority: 4500 },
    40: { price: 1000, majority: 10000, minority: 5000 },
    [Number.MAX_SAFE_INTEGER]: { price: 1100, majority: 11000, minority: 5500 },
  },
  luxury: {
    2: { price: 400, majority: 4000, minority: 2000 },
    3: { price: 500, majority: 5000, minority: 2500 },
    4: { price: 600, majority: 6000, minority: 3000 },
    5: { price: 700, majority: 7000, minority: 3500 },
    10: { price: 800, majority: 8000, minority: 4000 },
    20: { price: 900, majority: 9000, minority: 4500 },
    30: { price: 1000, majority: 10000, minority: 5000 },
    40: { price: 1100, majority: 11000, minority: 5500 },
    [Number.MAX_SAFE_INTEGER]: { price: 1200, majority: 12000, minority: 6000 },
  },
};
