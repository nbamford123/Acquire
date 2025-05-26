export type TileLocation = number | 'board' | 'bag' | 'dead';
export type Tile = { row: number; col: number; location: TileLocation };
