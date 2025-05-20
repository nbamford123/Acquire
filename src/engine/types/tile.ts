export type TileLocation = string | "board" | "bag" | "dead";
export type Tile = { row: number; col: number; location: TileLocation };
