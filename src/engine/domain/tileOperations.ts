import type { Tile } from "@/engine/types/tile.ts";
import { shuffleTiles } from "@/engine/utils/index.ts";

export const initializeTiles = (rows: number, cols: number): Tile[][] =>
  Array.from(
    { length: rows },
    (_, row) =>
      Array.from(
        { length: cols },
        (_, col) => ({
          row: row,
          col: col,
          location: "bag",
        }),
      ),
  );

export const drawTile = (
  tiles: Tile[][],
  playerName: string,
): [Tile, Tile[][]] | undefined => {
  const newTiles = [...tiles];
  const availableTiles = newTiles.flat().filter((tile) =>
    tile.location === "bag"
  );
  const randomTiles = shuffleTiles(availableTiles);
  const tile = randomTiles.pop();
  // No tiles left
  if (!tile) {
    return;
  }
  // TODO: need to check if it's dead before returning
  tile.location = playerName;
  return [tile, newTiles];
};
