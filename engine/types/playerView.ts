import type {
  BoardTile,
  ErrorCodeValue,
  GamePhase,
  HOTEL_NAME,
  HOTEL_TYPE,
  MergeContext,
  PlayerAction,
} from './index.ts';

// A hotel as the views show it. Price and bonuses are at its current size, or at founding size
// while it's off the board, like the physical game's information card.
export interface HotelView {
  shares: number; // left in the bank
  size: number;
  type: HOTEL_TYPE;
  price: number;
  majority: number;
  minority: number;
}

// What anyone can see of a game, including spectators: everyone's cash and shares are public
export interface GameView {
  gameId: string;
  owner: string;
  currentPhase: GamePhase;
  currentTurn: number;
  currentPlayer: number; // Player id
  pendingMergePlayer?: number; // next player to act in merger
  lastUpdated: number; // Timestamp
  // in player order; shares only lists hotels the player has shares in
  players: { name: string; money: number; shares: Record<HOTEL_NAME, number> }[];
  // Every hotel, on the board or not, by name
  hotels: Record<HOTEL_NAME, HotelView>;
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

// The view's hotels as a list, in the game's order, for when you need all of them rather than one
export const hotelList = (hotels: GameView['hotels']) =>
  (Object.entries(hotels) as [HOTEL_NAME, HotelView][]).map(([name, hotel]) => ({
    name,
    ...hotel,
  }));
