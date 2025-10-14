import { CHARACTER_CODE_A } from '../types/gameConfig.ts';

export const getTileLabel = (tile: { row: number; col: number }): string =>
  `${tile.col + 1}${String.fromCharCode(tile.row + CHARACTER_CODE_A)}`;
