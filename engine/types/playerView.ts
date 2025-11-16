import type {
  BoardTile,
  ErrorCodeValue,
  GamePhase,
  HOTEL_NAME,
  MergeContext,
} from './index.ts';

export type OrcCount = '0' | '1' | '2' | 'many';

// Player view of game state
export interface PlayerView {
  gameId: string;
  owner: string;
  playerId: number; // this player
  money: number; // this player's money
  stocks: Record<HOTEL_NAME, number>; // only hotels this player has shares in
  tiles: { row: number; col: number }[]; // this players tiles
  currentPhase: GamePhase;
  currentTurn: number;
  currentPlayer: number; // Player id
  pendingMergePlayer?: number; // next player to act in merger
  lastUpdated: number; // Timestamp
  // in player order
  players: { name: string; money: OrcCount; shares: Record<HOTEL_NAME, OrcCount> }[];
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
  error?: {
    code: ErrorCodeValue;
    message: string;
  } | null;
}
