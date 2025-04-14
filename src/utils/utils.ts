import type { Tile } from "@/models/Tile.ts";

export const sortTiles = (tile1: Tile, tile2: Tile): number =>
  tile1.col < tile2.col
    ? -1
    : tile1?.col > tile2?.col
    ? 1
    : tile1?.row - tile2?.row;

// Does an in place randomization of an array, then returns it
export const shuffleArray = (array: Tile[]): Tile[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
