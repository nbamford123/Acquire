import type { ErrorCodeValue, Hotel, Player, Tile } from './index.ts';

// Game phases
export enum GamePhase {
  WAITING_FOR_PLAYERS = 'WAITING_FOR_PLAYERS',
  PLAYER_TURN = 'PLAYER_TURN',
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
  lastUpdated: number; // Timestamp
  players: Player[]; // Sorted by player order
  hotels: Hotel[];
  tiles: Tile[][];
  pendingPlayerId?: number; // Next player to act for multi-player phases
  mergerTieContext?: {
    // for break tie we need to give user the hotels
    breakTie: [string, string];
    // possibly need to accumulate multiple tie breakers
    resolvedTies?: [string, string][];
  };
  mergerContext?: {
    survivingHotel: Hotel;
    mergedHotels: Hotel[];
  };
  foundHotelContext?: {
    availableHotels: Hotel[];
    tiles: Tile[];
  };
  lastActions: string[];
  error: {
    code: ErrorCodeValue;
    message: string;
  } | null;
}
