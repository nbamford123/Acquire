import { COLS, ROWS } from '@/engine/config/gameConfig.ts';

export const getAdjacentPositions = (row: number, col: number) =>
  [[-1, 0], [1, 0], [0, -1], [0, 1]]
    .map(([dr, dc]) => [row + dr, col + dc])
    .filter(([r, c]) => r >= 0 && r < ROWS && c >= 0 && c < COLS);
