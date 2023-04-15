export type TileLocation = string | 'board' | 'bag' | 'dead';
const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export class Tile {
  location: TileLocation = 'bag';
  row: string;
  col: number;
  constructor(row: string, col: number) {
    this.row = row;
    this.col = col;
  }
}
// Need more functionality in tiles-- draw, discard, play
export class Tiles {
  tiles: Array<Array<Tile>> = [];
  constructor() {
    this.tiles = Array.from({ length: 9 }, (_, row) =>
      Array.from({ length: 12 }, (_, col) => new Tile(rows[row], col + 1)),
    );
  }
  getTile(row: string, col: number): Tile {
    return this.tiles[rows.indexOf(row)][col];
  }
}
