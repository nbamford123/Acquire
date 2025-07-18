import type { ErrorCodeValue, Hotel, HOTEL_NAME, MergeContext, Player, Tile } from './index.ts';

// Game phases
export enum GamePhase {
  WAITING_FOR_PLAYERS = 'WAITING_FOR_PLAYERS',
  PLAY_TILE = 'PLAY_TILE',
  FOUND_HOTEL = 'FOUND_HOTEL',
  RESOLVE_MERGER = 'RESOLVE_MERGER',
  BREAK_MERGER_TIE = 'BREAK_MERGER_TIE',
  BUY_SHARES = 'BUY_SHARES',
  GAME_OVER = 'GAME_OVER',
}

// Serializable game state
export interface GameState {
  gameId: string;
  owner: string;
  currentPhase: GamePhase;
  currentTurn: number;
  currentPlayer: number; // Player id
  pendingMergePlayer?: number; // next player to act in merger
  lastUpdated: number; // Timestamp
  players: Player[]; // Sorted by player order
  hotels: Hotel[];
  tiles: Tile[];
  mergerTieContext?: {
    // for break tie we need to give user the hotels
    tiedHotels: HOTEL_NAME[];
  };
  mergeContext?: MergeContext;
  // change this to hotel name, too
  foundHotelContext?: {
    availableHotels: HOTEL_NAME[];
    tiles: { row: number; col: number }[];
  };
  error?: {
    code: ErrorCodeValue;
    message: string;
  } | null;
}
