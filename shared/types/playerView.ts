import type {
  BoardTile,
  ErrorCodeValue,
  GamePhase,
  Hotel,
  HOTEL_NAME,
  MergeContext,
  Player,
} from './index.ts';

// Player view of game state
export interface PlayerView {
  gameId: string;
  owner: string;
  player: string; // this player
  money: number; // this player's money
  stocks: Hotel[]; // only hotels this player has shares in
  tiles: { row: number; col: number }; // this players tiles
  currentPhase: GamePhase;
  currentTurn: number;
  currentPlayer: number; // Player id
  pendingMergePlayer?: number; // next player to act in merger
  lastUpdated: number; // Timestamp
  // in player order
  players: { name: string; money: number; shares: Hotel[] }[];
  // Existing hotels with available shares
  hotelShares: Hotel[];
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
