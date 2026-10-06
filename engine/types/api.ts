import type { ActionType, ClientAction } from './actionsTypes.ts';
import type { GameInfo } from './gameInfo.ts';
import type { GameView, PlayerView } from './playerView.ts';

// What each endpoint takes and returns, shared by the service and the client

// POST /api/login
export interface LoginRequest {
  email: string;
}
export interface LoginResponse {
  success: true;
  user: string;
}

// GET /api/games
export interface GamesResponse {
  games: GameInfo[];
}

// POST /api/games
export interface CreateGameResponse {
  gameId: string;
}

// GET /api/games/:id: a spectator's view when the user isn't in the game
export interface GameResponse {
  game: GameView | PlayerView;
}

// POST /api/games/:id
export interface ActionRequest {
  action: ClientAction;
}
// A player who just left has no view of the game
export interface ActionResponse {
  action: ActionType;
  game?: PlayerView;
}

// GET /api/leaderboard: every player who has finished a game, most earnings first
export interface PlayerStats {
  name: string;
  gamesPlayed: number;
  gamesWon: number; // Every player tied for the most money wins
  earnings: number; // Final money, summed across finished games
}
export interface LeaderboardResponse {
  players: PlayerStats[];
}

// Any failed request
export interface ErrorResponse {
  error: string;
}
