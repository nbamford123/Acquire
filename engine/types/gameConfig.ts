export const CHARACTER_CODE_A = 65;
export const ROWS = 9;
export const COLS = 12;
export const MAX_PLAYERS = 6;
export const INITIAL_PLAYER_MONEY = 3000;
// Other players' cash is shown as a tier; these are the upper bounds of tiers 1-3, relative to
// starting cash so it falls in tier 3
export const CASH_TIER_LIMITS = [
  INITIAL_PLAYER_MONEY / 3,
  INITIAL_PLAYER_MONEY,
  INITIAL_PLAYER_MONEY * 2,
] as const;
export const MINIMUM_PLAYERS = 2;
export const TILES_PER_HAND = 6;
export const RESERVED_NAMES = ['bank', 'bag', 'board', 'dead'];
export const SAFE_HOTEL_SIZE = 11;
export const END_GAME_HOTEL_SIZE = 41;
