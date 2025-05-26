import type { Tile } from '@/engine/types/tile.ts';

export const cmpTiles = (tile1: Tile, tile2: Tile): number =>
  tile1.col < tile2.col ? -1 : tile1?.col > tile2?.col ? 1 : tile1?.row - tile2?.row;
