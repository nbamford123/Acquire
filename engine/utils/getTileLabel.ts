import { CHARACTER_CODE_A } from '../types/gameConfig.ts';

export const getTileLabel = (tile: { row: number; col: number }): string =>
  `${tile.row + 1}${String.fromCharCode(tile.col + CHARACTER_CODE_A)}`;
