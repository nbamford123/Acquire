export type AppView = 'login' | 'game-list' | 'game';

export interface AppState {
  currentView: AppView;
  user: string | null;
  selectedGameId: string | null;
  error: string | null;
}
export type Route = { view: AppView; gameId?: string };
