import type { ITile, Tile } from "./Tile.ts";
import { Share } from "./Share.ts";

export type HOTEL_NAME =
  | "Worldwide"
  | "Sackson"
  | "Festival"
  | "Imperial"
  | "American"
  | "Continental"
  | "Tower";

export type HOTEL_TYPE = "economy" | "standard" | "luxury";
export type IHotel = {
  name: HOTEL_NAME;
  type: HOTEL_TYPE;
  remainingShares: number;
  safe: boolean;
  sharePrice: number;
  tiles: ITile[];
};

export class Hotel {
  readonly name: HOTEL_NAME;
  readonly type: HOTEL_TYPE;
  private _tiles: Tile[] = [];
  private _shares: Share[] = [];

  constructor(name: HOTEL_NAME, type: HOTEL_TYPE) {
    this.name = name;
    this.type = type;
    // Initialize this hotel with 25 shares
    this._shares = Array.from({ length: 25 }, () => new Share());
  }

  get safe(): boolean {
    return this.tiles.length >= 11;
  }

  /**
   * Gets the current share price based on hotel size and type
   */
  get sharePrice(): number {
    const size = this.tiles.length;
    const prices = SharePrices[this.type];

    // Find the appropriate price bracket for the current size
    const sizeBrackets = Object.keys(prices).map(Number).sort((a, b) => a - b);
    for (const bracket of sizeBrackets) {
      if (size <= bracket) {
        return prices[bracket];
      }
    }
    // If no bracket matched (should not happen with properly configured prices)
    return prices[sizeBrackets[sizeBrackets.length - 1]];
  }

  /**
   * Gets the number of shares available in the bank
   */
  get remainingShares(): number {
    return this.shares.filter((share) => share.location === "bank").length;
  }

  /**
   * Gets all tiles in this hotel
   */
  get tiles(): Tile[] {
    return [...this._tiles]; // Return a copy to prevent external modification
  }

  /**
   * Gets all shares for this hotel
   */
  get shares(): Share[] {
    return [...this._shares]; // Return a copy to prevent external modification
  }

  /**
   * Allocates shares to a player from the bank
   * @param player The player who is buying shares
   * @param amount Number of shares requested
   * @returns Number of shares successfully allocated
   */
  allocateShares = (player: string, amount: number): number => {
    let allocated = 0;
    const availableShares = this._shares.filter((share) =>
      share.location === "bank"
    );

    // Only allocate up to the available amount
    const sharesToAllocate = Math.min(amount, availableShares.length);

    for (let i = 0; i < sharesToAllocate; i++) {
      availableShares[i].location = player;
      allocated++;
    }

    return allocated;
  };

  /**
   * Returns shares to the bank
   * @param player The player returning shares
   * @param amount Number of shares to return
   * @returns Number of shares successfully returned
   */
  returnShares(player: string, amount: number): number {
    let returned = 0;
    const playerShares = this._shares.filter((share) =>
      share.location === player
    );

    // Only return up to what the player has
    const sharesToReturn = Math.min(amount, playerShares.length);

    for (let i = 0; i < sharesToReturn; i++) {
      playerShares[i].location = "bank";
      returned++;
    }

    return returned;
  }

  /**
   * Add a tile to the hotel
   * @param tile The tile to add (must be on the board)
   * @returns Whether the tile was successfully added
   */
  addTile(tile: Tile): boolean {
    if (tile.location !== "board") {
      return false;
    }
    // Check if this tile is already in another hotel
    if (this._tiles.some((t) => t.row === tile.row && t.col === tile.col)) {
      return false;
    }
    this._tiles.push(tile);
    return true;
  }

  /**
   * Count how many shares a player owns in this hotel
   * @param player The player name
   * @returns Number of shares owned
   */
  getPlayerShareCount(player: string): number {
    return this._shares.filter((share) => share.location === player).length;
  }

  /**
   * Merges this hotel with another hotel
   * @param otherHotel The hotel being merged into this one
   * @returns Whether the merger was successful
   */
  mergeWith(otherHotel: Hotel): boolean {
    // Can't merge if either hotel is safe
    if (this.safe || otherHotel.safe) {
      return false;
    }

    // Add all tiles from the other hotel
    otherHotel.tiles.forEach((tile) => {
      this.addTile(tile);
    });

    // Return all shares from the other hotel to the bank
    otherHotel._shares.forEach((share) => {
      share.location = "bank";
    });

    // Clear the other hotel's tiles
    otherHotel._tiles = [];

    return true;
  }

  /**
   * Serializes the hotel for network transmission or storage
   */
  serialize = (): IHotel => {
    return {
      name: this.name,
      type: this.type,
      remainingShares: this.remainingShares,
      safe: this.safe,
      sharePrice: this.sharePrice,
      tiles: this.tiles.map((tile) => tile.serialize()),
    };
  };
}

export const SharePrices: Record<HOTEL_TYPE, Record<number, number>> = {
  economy: {
    2: 200,
    3: 300,
    4: 400,
    5: 500,
    10: 600,
    20: 700,
    30: 800,
    40: 900,
    [Number.MAX_SAFE_INTEGER]: 1000,
  },
  standard: {
    2: 300,
    3: 400,
    4: 500,
    5: 600,
    10: 700,
    20: 800,
    30: 900,
    40: 1000,
    [Number.MAX_SAFE_INTEGER]: 1100,
  },
  luxury: {
    2: 400,
    3: 500,
    4: 600,
    5: 700,
    10: 800,
    20: 900,
    30: 1000,
    40: 1100,
    [Number.MAX_SAFE_INTEGER]: 1200,
  },
};
export const Hotels: Hotel[] = [
  new Hotel("Worldwide", "economy"),
  new Hotel("Sackson", "economy"),
  new Hotel("Festival", "standard"),
  new Hotel("Imperial", "standard"),
  new Hotel("American", "standard"),
  new Hotel("Continental", "luxury"),
  new Hotel("Tower", "luxury"),
];
