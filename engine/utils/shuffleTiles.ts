import type { Tile } from '../types/tile.ts';

// Does an in place randomization of an array, then returns it
export const shuffleTiles = (array: Tile[]): Tile[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
