import { CHARACTER_CODE_A } from "@/config/gameConfig.ts";

export type TileLocation = string | "board" | "bag" | "dead";
export type ITile = { row: number; col: number; location: TileLocation };

export class Tile {
  private _location: TileLocation = "bag";
  public readonly row: number;
  public readonly col: number;

  constructor(row: number, col: number) {
    this.row = row;
    this.col = col;
  }

  // Return the label as it would appear on the tile
  get label() {
    return `${this.row + 1}${String.fromCharCode(this.col + CHARACTER_CODE_A)}`;
  }
  get location(): TileLocation {
    return this._location;
  }

  moveToBoard = () => {
    this._location = "board";
  };
  markAsDead = () => {
    this._location = "dead";
  };
  moveToPlayerHand = (playerName: string) => {
    this._location = playerName;
  };

  serialize = () => {
    return { row: this.row, col: this.col, location: this.location };
  };
}
