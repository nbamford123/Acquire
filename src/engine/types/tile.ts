import type { HOTEL_NAME } from './hotel.ts';

export type BoardTile = {
  row: number;
  col: number;
  location: 'board';
  hotel?: HOTEL_NAME;
};

export type Tile =
  | BoardTile
  | (
    & { row: number; col: number }
    & (
      | { location: 'bag' }
      | { location: 'dead' }
      | { location: number }
    )
  );
