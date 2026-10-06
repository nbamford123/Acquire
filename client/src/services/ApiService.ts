import { dispatchAppError, dispatchAuthError } from './EventBus.ts';
import type {
  ActionRequest,
  ActionResponse,
  ClientAction,
  CreateGameResponse,
  GameResponse,
  GamesResponse,
  LeaderboardResponse,
  LoginRequest,
  LoginResponse,
} from '@acquire/engine/types';

// silent skips the app error for failures the user doesn't need to hear about, like a background
// poll; an expired session still sends them to login
const checkResult = async (res: Response, silent = false) => {
  if (!res.ok) {
    if (res.status === 401) {
      dispatchAuthError();
    }
    let errorMessage = 'Unknown Error';
    try {
      const body = await res.json();
      errorMessage = body?.error || errorMessage;
    } catch {
      // ignore JSON parse errors
    }
    if (!silent) {
      dispatchAppError(errorMessage);
    }
    return false;
  }
  return true;
};

// The response when the request succeeded, otherwise null after reporting the error
const send = async (path: string, init?: RequestInit, silent = false) => {
  const response = await fetch(path, init);
  return await checkResult(response, silent) ? response : null;
};

const getJson = async <T>(path: string, silent = false) => {
  const response = await send(path, undefined, silent);
  return response ? await response.json() as T : null;
};

const postJson = async <T>(path: string, body?: unknown) => {
  const response = await send(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return response ? await response.json() as T : null;
};

const gamePath = (gameId: string) => `/api/games/${encodeURIComponent(gameId)}`;

export const login = (email: string) =>
  postJson<LoginResponse>('/api/login', { email } satisfies LoginRequest);

export const listGames = () => getJson<GamesResponse>('/api/games');

export const getLeaderboard = () => getJson<LeaderboardResponse>('/api/leaderboard');

export const createGame = () => postJson<CreateGameResponse>('/api/games');

export const getGame = (gameId: string, { silent = false } = {}) =>
  getJson<GameResponse>(gamePath(gameId), silent);

export const sendAction = (gameId: string, action: ClientAction) =>
  postJson<ActionResponse>(gamePath(gameId), { action } satisfies ActionRequest);

// Whether the game was deleted
export const deleteGame = async (gameId: string) =>
  (await send(gamePath(gameId), { method: 'DELETE' })) !== null;
