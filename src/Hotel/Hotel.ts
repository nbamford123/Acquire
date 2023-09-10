import { Tile } from '../Tile/Tile.js';
import { Share } from './Share';

import type { HOTEL_NAME, HOTEL_TYPE, IHotel } from '../types';
export class Hotel {
  name: HOTEL_NAME;
  tiles: Array<Tile> = [];
  shares: Array<Share> = Array.from({ length: 25 }, () => new Share());
  type: HOTEL_TYPE;

  constructor(name: HOTEL_NAME, type: HOTEL_TYPE) {
    this.name = name;
    this.type = type;
  }
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

  get safe(): boolean {
    return this.tiles.length >= 11;
  }

  get sharePrice(): number {
    const sharePrices = SharePrices[this.type];
    const bounds = Object.keys(sharePrices).map((k) => +k);
    for (const bound of bounds) {
      if (bound === this.tiles.length) return sharePrices[bound];
      else if (bound > this.tiles.length) return sharePrices[bound];
    }
    // Technically impossible, but typescript doesn't like it
    return sharePrices[bounds[bounds.length - 1]];
  }

  get remainingShares(): number {
    return this.shares.filter((share) => share.location === 'bank').length;
  }

  // Allocate shares to a player, up to the maximum available, returns number successfully allocated
  allocateShares = (player: string, amount: number): number => {
    let allocated = 0;
    while (allocated < amount) {
      const index = this.shares.findIndex((share) => share.location === 'bank');
      if (index === -1) return allocated;
      this.shares[index].location = player;
      allocated++;
    }
    return allocated;
  };

  // Add a tile to the hotel-- assumes it's already on the board
  addTile = (tile: Tile) => this.tiles.push(tile);
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
export const Hotels: Array<Hotel> = [
  new Hotel('Worldwide', 'economy'),
  new Hotel('Sackson', 'economy'),
  new Hotel('Festival', 'standard'),
  new Hotel('Imperial', 'standard'),
  new Hotel('American', 'standard'),
  new Hotel('Continental', 'luxury'),
  new Hotel('Tower', 'luxury'),
];
