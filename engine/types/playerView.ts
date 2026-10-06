import type {
  BoardTile,
  ErrorCodeValue,
  GamePhase,
  HOTEL_NAME,
  MergeContext,
  PlayerAction,
} from './index.ts';

export type OrcCount = '0' | '1' | '2' | 'many';
// Relative size of a player's cash, 1 (lowest) to 4 (highest), see CASH_TIER_LIMITS
export type CashTier = 1 | 2 | 3 | 4;

// What anyone can see of a game, including spectators: other players' cash and shares only roughly
export interface GameView {
  gameId: string;
  owner: string;
  currentPhase: GamePhase;
  currentTurn: number;
  currentPlayer: number; // Player id
  pendingMergePlayer?: number; // next player to act in merger
  lastUpdated: number; // Timestamp
  // in player order
  players: { name: string; money: CashTier; shares: Record<HOTEL_NAME, OrcCount> }[];
  // Existing hotels with available shares
  hotels: Record<HOTEL_NAME, { shares: number; size: number }>;
  board: BoardTile[];
  mergerTieContext?: {
    // for break tie we need to give user the hotels
    tiedHotels: HOTEL_NAME[];
  };
  mergeContext?: MergeContext;
  foundHotelContext?: {
    availableHotels: HOTEL_NAME[];
    tiles: { row: number; col: number }[];
  };
  // Only at game over: every player's final money, highest first
  finalStandings?: { name: string; money: number }[];
  actions: PlayerAction[];
  error?: {
    code: ErrorCodeValue;
    message: string;
  } | null;
}

// What a player sees: the game plus their own seat
export interface PlayerView extends GameView {
  playerId: number; // this player
  money: number; // this player's money
  stocks: Record<HOTEL_NAME, number>; // only hotels this player has shares in
  // this players tiles; unplayable says why a tile can't be played right now
  tiles: { row: number; col: number; unplayable?: string }[];
}

export const isPlayerView = (view: GameView): view is PlayerView => 'playerId' in view;
