export const cmpTiles = (
  tile1: { row: number; col: number },
  tile2: { row: number; col: number },
): number => tile1.col < tile2.col ? -1 : tile1?.col > tile2?.col ? 1 : tile1?.row - tile2?.row;
