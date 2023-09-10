import type { ITile } from './types';

export const sortTiles = (tile1: ITile, tile2: ITile): number =>
  tile1.col < tile2.col
    ? -1
    : tile1?.col > tile2?.col
    ? 1
    : tile1?.row - tile2?.row;
