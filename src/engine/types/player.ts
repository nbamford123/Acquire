 import type { HOTEL_NAME } from './hotel.ts';
import type { Tile } from './tile.ts';

export type Player = {
  id: number;
  name: string;
  firstTile?: Tile;
  money: number;
  shares: Record<HOTEL_NAME, number> | Record<string, never>;
  tiles: Tile[];
};
