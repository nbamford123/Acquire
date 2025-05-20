import type { HOTEL_NAME } from "@/engine/domain/Hotel.ts";
import type { Player, Tile } from "@/engine/types/index.ts";

// Game phases
export enum GamePhase {
  WAITING_FOR_PLAYERS = "WAITING_FOR_PLAYERS",
  ACTIVE = "ACTIVE",
  PLAY_TILE = "PLAY_TILE",
  FOUND_HOTEL = "FOUND_HOTEL",
  RESOLVE_MERGER = "RESOLVE_MERGER",
  BUY_SHARES = "BUY_SHARES",
  GAME_OVER = "GAME_OVER",
}

// Serializable game state
export interface GameState {
  gameId: string;
  owner: string;
  currentPhase: GamePhase;
  currentTurn: number;
  currentPlayer: string; // Player name
  lastUpdated: number; // Timestamp
  players: Player[]; // Sorted by player order
  hotels: Array<{
    name: HOTEL_NAME;
    size: number;
    safe: boolean;
    sharePrice: number;
    remainingShares: number;
  }>;
  tiles: Tile[][];
  pendingDecision?: {
    type: "foundHotel" | "resolveMerger" | "acquirerBonus" | "targetBonus";
    options: Array<string>; // Hotel names or other options
    deadline?: number; // Optional timestamp for decision timeout
  };
  lastAction?: {
    player: string;
    action: string;
    timestamp: number;
  };
}
