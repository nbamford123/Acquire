import { COLS, ROWS } from "@/config/gameConfig.ts";
import { Hotels } from "@/models/Hotel.ts";
import { type ITile, Tile } from "./Tile.ts";
import { shuffleArray } from "@/utils/utils.ts";

export class TileManager {
  // 2D Array of all possible tiles
  private tiles: Tile[][] = [];

  constructor() {
    // Initialize tile array
    this.tiles = Array.from(
      { length: ROWS },
      (_, row) => Array.from({ length: COLS }, (_, col) => new Tile(row, col)),
    );
  }

  // Get a flat array of all tiles
  getAllTiles(): Tile[] {
    return this.tiles.flat();
  }

  /**
   * Serializes visible tiles for a specific player
   * @param player The player name
   * @returns Array of serialized tiles visible to the player
   */
  serializeVisibleTiles = (player: string): ITile[] => {
    return this.getAllTiles()
      .filter(
        (tile) =>
          tile.location === "board" ||
          tile.location === player ||
          tile.location === "dead",
      )
      .map((tile) => tile.serialize());
  };

  /**
   * Draws random tiles from the bag for a player
   * @param player The player who is drawing tiles
   * @param amount Number of tiles to draw
   * @returns Array of drawn tiles
   */
  drawTiles = (player: string, amount: number): Tile[] => {
    const availableTiles = this.getAllTiles().filter((tile) =>
      tile.location === "bag"
    );
    const shuffledTiles = shuffleArray(availableTiles);

    const tilesToDraw = shuffledTiles.slice(
      0,
      Math.min(amount, shuffledTiles.length),
    );
    tilesToDraw.forEach((tile) => tile.moveToPlayerHand(player));

    return tilesToDraw;
  };

  /**
   * Gets all tiles in a player's hand
   * @param player The player name
   * @returns Array of tiles in the player's hand
   */
  getPlayerTiles = (player: string) =>
    this.tiles.flat().filter((tile) => tile.location === player);

  /**
   * Gets a specific tile from a player's hand if it exists
   * @param row The tile's row
   * @param col The tile's column
   * @param player The player name
   * @returns The tile if found in player's hand, null otherwise
   */
  getTileFromPlayerHand(row: number, col: number, player: string): Tile | null {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
      return null;
    }

    const tile = this.tiles[row][col];
    return tile.location === player ? tile : null;
  }

  /**
   * Gets a tile at a specific position regardless of its location
   * @param row The tile's row
   * @param col The tile's column
   * @returns The tile at the specified position
   */
  getTileAt(row: number, col: number): Tile | null {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
      return null;
    }

    return this.tiles[row][col];
  }

  /**
   * Utility function to find which hotel a tile belongs to
   * @param row The tile's row
   * @param col The tile's column
   * @param hotels Array of hotels to check
   * @returns The hotel name if found, null otherwise
   */
  findHotelForTile(
    row: number,
    col: number,
  ): string | null {
    const tile = this.getTileAt(row, col);
    if (!tile || tile.location !== "board") {
      return null;
    }

    for (const hotel of Hotels) {
      if (hotel.tiles.some((t: ITile) => t.row === row && t.col === col)) {
        return hotel.name;
      }
    }

    return null;
  }

  /**
   * Play a tile from a player's hand to the board
   * @param row The tile's row
   * @param col The tile's column
   * @param player The player name
   * @returns Whether the operation was successful
   */
  playTile(row: number, col: number, player: string): boolean {
    const tile = this.getTileFromPlayerHand(row, col, player);
    if (!tile) {
      return false;
    }

    tile.moveToBoard();
    return true;
  }
}
