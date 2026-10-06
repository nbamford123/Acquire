// A string describing the game action a player made during the given turn. turn is the round, and
// player is the id of the player whose turn it was, unset before the game starts.
export type PlayerAction = {
  turn: number;
  player?: number;
  action: string;
};
