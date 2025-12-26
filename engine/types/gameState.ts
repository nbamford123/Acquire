import type {
  ErrorCodeValue,
  FoundHotelContext,
  Hotel,
  HOTEL_NAME,
  MergeContext,
  Player,
  Tile,
} from './index.ts';

// Game phases
export enum GamePhase {
  WAITING_FOR_PLAYERS = 'Waiting for players',
  PLAY_TILE = 'Play Tile',
  FOUND_HOTEL = 'Found Hotel',
  RESOLVE_MERGER = 'RESOLVE_MERGER',
  BREAK_MERGER_TIE = 'BREAK_MERGER_TIE',
  BUY_SHARES = 'Buy Shares',
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
  foundHotelContext?: FoundHotelContext;
  error?: {
    code: ErrorCodeValue;
    message: string;
  } | null;
}
