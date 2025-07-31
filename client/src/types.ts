export type AppView = 'login' | 'game-list' | 'game-board';

export interface AppState {
  currentView: AppView;
  user: string | null;
  selectedGameId: string | null;
  error: string | null;
}

export interface GameState {
  id: string;
  phase: string;
  maxPlayers: number;
  players: string[];
}
