import type { Tile } from "@/models/Tile.ts";

/**
 * Sorts an array of tiles in ascending order.
 * Tiles are ranked by column first, then by row.
 *
 * @param {Tile[]} tiles - The array of tiles to sort.
 * @returns {Tile[]} The sorted array of tiles.
 */
export const sortTiles = (tiles: Tile[]): Tile[] =>
  tiles.sort((a, b) => a.col === b.col ? a.row - b.row : a.col - b.col);
