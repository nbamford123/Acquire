import type { HOTEL_NAME } from './hotel.ts';
import type { Tile } from './tile.ts';

export type Player = {
  id: number;
  name: string;
  firstTile?: Tile;
  money: number;
  shares: Partial<Record<HOTEL_NAME, number>>;
  tiles: Tile[];
};
