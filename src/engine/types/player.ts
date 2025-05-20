import { HOTEL_NAME } from "./hotel.ts";
import type { Tile } from "./tile.ts";

export interface Player {
  name: string;
  firstTile?: Tile;
  money: number;
  shares: Record<HOTEL_NAME, number> | Record<HOTEL_NAME, never>;
}
