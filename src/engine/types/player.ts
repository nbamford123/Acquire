export type Player = {
  id: number;
  name: string;
  firstTile?: { row: number; col: number };
  money: number;
};
