import type { HOTEL_NAME } from "@/models/Hotel.ts";
import { Tile } from "@/models/Tile.ts";

export class Player {
  private _name: string;
  private _money: number;
  private _firstTile: Tile;
  private _shares: Record<HOTEL_NAME, number> | Record<string, never> = {};

  constructor(name: string, money: number) {
    this._name = name;
    this._money = money;
    this._firstTile = new Tile(0, 0);
  }
  get name() {
    return this._name;
  }
  get money() {
    return this._money;
  }
  get firstTile(): Tile {
    return this._firstTile;
  }
  set firstTile(tile: Tile) {
    this._firstTile = tile;
  }
  get shares() {
    return this._shares;
  }
  // Note this will be different depending on whether it's the player itself getting the game state, or other players
  // Maybe pass in TileManager here so we can get the player's tiles?
  serialize() {
    return {
      name: this._name,
      money: this._money,
      firstTile: this._firstTile,
      shares: this._shares,
    };
  }
}
