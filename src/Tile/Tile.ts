export const CHARACTER_CODE_A = 65;
export const ROWS = 12;
export const COLS = 9;

import type { TileLocation, ITile } from '../types';
export class Tile {
  private _location: TileLocation = 'bag';
  row: number;
  col: number;
  constructor(row: number, col: number) {
    this.row = row;
    this.col = col;
  }
  serialize = () => {
    return { row: this.row, col: this.col, location: this.location };
  };

  // Return the label as it would appear on the tile
  get label() {
    return `${this.row + 1}${String.fromCharCode(this.col + CHARACTER_CODE_A)}`;
  }
  get location(): TileLocation {
    return this._location;
  }
  play = () => (this._location = 'board');
  dead = () => (this._location = 'dead');
  draw = (playerName: string) => (this._location = playerName);
}

// Does an in place randomization of an array, then returns it
const shake = (bag: Array<Tile>): Array<Tile> => {
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
};

// Need more functionality in tiles-- draw, discard, play
// These need to stay in order, I think. We can provide a randomized bag for drawing, but if we're going to
// build the board from this class, it would be a lot easier to deal with if it's always in the proper
// positions
export class Tiles {
  // 2D Array of all possible tiles
  tiles: Array<Array<Tile>> = [];
  constructor() {
    // Initialize tile array
    this.tiles = Array.from({ length: ROWS }, (_, row) =>
      Array.from({ length: COLS }, (_, col) => new Tile(row, col)),
    );
  }

  // Serialize for game data, but only return the tiles this player can see
  serialize = (player: string): Array<ITile> => {
    return this.tiles
      .flat()
      .filter(
        (tile) =>
          tile.location === 'board' ||
          tile.location === player ||
          tile.location === 'dead',
      )
      .map((tile) => tile.serialize());
  };

  // Note: Figure out jsdoc
  // Returns randomly selected number of tiles requested from bag if available, or remaining
  drawTiles = (player: string, amount: number): Array<Tile> => {
    const bag = this.tiles.flat().filter((tile) => tile.location === 'bag');
    const returnTiles =
      bag.length <= amount ? bag : shake(bag).slice(0, amount);
    returnTiles.forEach((tile) => tile.draw(player));
    return returnTiles;
  };
  getPlayerTiles = (player: string) =>
    this.tiles.flat().filter((tile) => tile.location === player);
}
