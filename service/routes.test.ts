import { Hono } from 'hono';
import { assertEquals } from '@std/assert';
import { expect } from '@std/expect';

import { ActionTypes, createAction } from '@acquire/engine/types';
import { setRoutes } from './routes.ts';
import { clearCache } from './auth.ts';
import type { ServiceEnv } from './types.ts';

// Build the app from the routes rather than importing main.ts, which starts a server
const app = new Hono<ServiceEnv>();
setRoutes(app);

// Mock environment for testing
clearCache();
Deno.env.set('ALLOWED_EMAILS', 'TestUser:test@example.com, Admin:admin@test.com');

const login = async (
  app: Hono<ServiceEnv>,
  email = 'test@example.com',
): Promise<string> => {
  const response = await app.fetch(
    new Request('http://localhost/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    }),
  );

  const setCookieHeaders = response.headers.getSetCookie() || [];
  return setCookieHeaders.map((cookie: string) => cookie.split(';')[0]).join(
    '; ',
  );
};

Deno.test('POST /api/login logs in', async () => {
  const response = await app.fetch(
    new Request('http://localhost/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@example.com' }),
    }),
  );
  assertEquals(response.status, 200);
  const data = await response.json();
  assertEquals((data as { user: string }).user, 'TestUser');
});

Deno.test('POST /login invalid email does not log in', async () => {
  const response = await app.fetch(
    new Request('http://localhost/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'super@fly.com' }),
    }),
  );
  assertEquals(response.status, 403);
});

Deno.test('GET /games returns empty game list', async () => {
  const cookies = await login(app);
  // Make a raw request instead
  const response = await app.fetch(
    new Request('http://localhost/api/games', {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
    }),
  );
  assertEquals(response.status, 200);
  const bodyJson = await response.json();
  assertEquals(bodyJson.games.length, 0);
});

Deno.test('GET /games returns game list', async () => {
  const cookies = await login(app);

  // Create game 1
  const createResponse = await app.fetch(
    new Request('http://localhost/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({ player: 'hono' }),
    }),
  );
  const { gameId: game1 } = await createResponse.json();

  // Create game 2
  const createResponse2 = await app.fetch(
    new Request('http://localhost/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({ player: 'hono' }),
    }),
  );
  const { gameId: game2 } = await createResponse2.json();

  const getResponse = await app.fetch(
    new Request('http://localhost/api/games', {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
    }),
  );
  assertEquals(getResponse.status, 200);
  const { games } = await getResponse.json();
  assertEquals(games.length, 2);
  // Games list by id, and two made in the same millisecond can sort either way
  assertEquals(games.map((g: { id: string }) => g.id).sort(), [game1, game2].sort());
});

Deno.test('POST /games creates a game and returns the id', async () => {
  const cookies = await login(app);

  const response = await app.fetch(
    new Request('http://localhost/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
    }),
  );
  const bodyJson = await response.json();
  assertEquals(response.status, 201);
  expect(bodyJson.gameId).toEqual(expect.any(String));
});

Deno.test('GET /games/:id gets a game', async () => {
  const cookies = await login(app);

  const createResponse = await app.fetch(
    new Request('http://localhost/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({ player: 'hono' }),
    }),
  );

  const { gameId } = await createResponse.json();

  // Verify game exists
  const getResponse = await app.fetch(
    new Request(`http://localhost/api/games/${gameId}`, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
    }),
  );
  assertEquals(getResponse.status, 200);
  const gameResponse = await getResponse.json();
  assertEquals(gameResponse.game.gameId, gameId);
});

Deno.test('DELETE /games/:id deletes a game', async () => {
  const cookies = await login(app);

  const createResponse = await app.fetch(
    new Request('http://localhost/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({ player: 'hono' }),
    }),
  );
  const { gameId } = await createResponse.json();

  // Delete the game
  const deleteResponse = await app.fetch(
    new Request(`http://localhost/api/games/${gameId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': cookies,
      },
    }),
  );
  expect(deleteResponse.status).toBe(204);

  // Verify game no longer exists
  const getResponse = await app.fetch(
    new Request(`http://localhost/api/games/${gameId}`, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
    }),
  );
  expect(getResponse.status).toBe(404);
});

Deno.test('POST /games creates a game with a readable id', async () => {
  const cookies = await login(app);
  const response = await app.fetch(
    new Request('http://localhost/api/games', { method: 'POST', headers: { 'Cookie': cookies } }),
  );
  const { gameId } = await response.json();
  expect(gameId).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*-[1-9][0-9]$/);
});

Deno.test('GET /games/:id shows anyone else a spectator view', async () => {
  const cookies = await login(app);
  const adminCookies = await login(app, 'admin@test.com');
  const request = (path: string, init: RequestInit, as: string) =>
    app.fetch(new Request(`http://localhost${path}`, { ...init, headers: { 'Cookie': as } }));

  const { gameId } = await (await request('/api/games', { method: 'POST' }, cookies)).json();
  const response = await request(`/api/games/${gameId}`, { method: 'GET' }, adminCookies);
  assertEquals(response.status, 200);
  const { game } = await response.json();
  assertEquals(game.gameId, gameId);
  assertEquals('playerId' in game, false);
  assertEquals('tiles' in game, false);
});

Deno.test('POST /games/:id lets a player leave before the game starts', async () => {
  const cookies = await login(app);
  const adminCookies = await login(app, 'admin@test.com');
  const request = (path: string, init: RequestInit, as: string) =>
    app.fetch(
      new Request(`http://localhost${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', 'Cookie': as },
      }),
    );
  const act = (gameId: string, type: string, as: string) =>
    request(`/api/games/${gameId}`, {
      method: 'POST',
      body: JSON.stringify({ action: { type, payload: {} } }),
    }, as);

  const { gameId } = await (await request('/api/games', { method: 'POST' }, cookies)).json();
  assertEquals((await act(gameId, 'ADD_PLAYER', adminCookies)).status, 200);
  const leave = await act(gameId, 'REMOVE_PLAYER', adminCookies);
  assertEquals(leave.status, 200);
  assertEquals(await leave.json(), { action: 'REMOVE_PLAYER' });
  const view = (await (await request(`/api/games/${gameId}`, { method: 'GET' }, cookies)).json())
    .game;
  assertEquals(view.players.map((player: { name: string }) => player.name), ['TestUser']);

  // The owner deletes the game instead
  const ownerLeave = await act(gameId, 'REMOVE_PLAYER', cookies);
  assertEquals(ownerLeave.status, 400);
});

Deno.test('DELETE /games/:id only lets the owner delete a game', async () => {
  const cookies = await login(app);
  const adminCookies = await login(app, 'admin@test.com');
  const request = (path: string, init: RequestInit, as: string) =>
    app.fetch(new Request(`http://localhost${path}`, { ...init, headers: { 'Cookie': as } }));

  const { gameId } = await (await request('/api/games', { method: 'POST' }, cookies)).json();
  const deleteResponse = await request(`/api/games/${gameId}`, { method: 'DELETE' }, adminCookies);
  assertEquals(deleteResponse.status, 403);
  assertEquals((await deleteResponse.json()).error, 'Only the owner can delete a game');

  const getResponse = await request(`/api/games/${gameId}`, { method: 'GET' }, cookies);
  assertEquals(getResponse.status, 200);
});

Deno.test('POST /games/:id performs actions', async () => {
  const cookies = await login(app);

  // Create a game
  const createResponse = await app.fetch(
    new Request('http://localhost/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({ player: 'hono' }),
    }),
  );
  const { gameId } = await createResponse.json();

  // A second player joins (the service takes the player from the login, not the payload)
  const adminCookies = await login(app, 'admin@test.com');
  const addPlayer = createAction(ActionTypes.ADD_PLAYER, {});
  const postResponse = await app.fetch(
    new Request(`http://localhost/api/games/${gameId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookies,
      },
      body: JSON.stringify({ action: addPlayer }),
    }),
  );
  assertEquals(postResponse.status, 200);

  const startGame = createAction(ActionTypes.START_GAME, {});
  const startResponse = await app.fetch(
    new Request(`http://localhost/api/games/${gameId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({ action: startGame }),
    }),
  );
  assertEquals(startResponse.status, 200);
});

Deno.test('POST /games/:id updates lastUpdated', async () => {
  const cookies = await login(app);
  const adminCookies = await login(app, 'admin@test.com');
  const request = (path: string, init: RequestInit = {}, as = cookies) =>
    app.fetch(
      new Request(`http://localhost${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', 'Cookie': as },
      }),
    );

  const createResponse = await request('/api/games', {
    method: 'POST',
    body: JSON.stringify({ player: 'hono' }),
  });
  const { gameId } = await createResponse.json();
  const before = (await (await request(`/api/games/${gameId}`)).json()).game.lastUpdated;

  await new Promise((resolve) => setTimeout(resolve, 5));
  const addPlayer = createAction(ActionTypes.ADD_PLAYER, {});
  const postResponse = await request(`/api/games/${gameId}`, {
    method: 'POST',
    body: JSON.stringify({ action: addPlayer }),
  }, adminCookies);
  const after = (await postResponse.json()).game.lastUpdated;
  const saved = (await (await request(`/api/games/${gameId}`)).json()).game.lastUpdated;

  assertEquals(after > before, true);
  assertEquals(saved, after);
});

Deno.test('POST /games/:id rejects invalid moves without saving them', async () => {
  const cookies = await login(app);
  const request = (path: string, init: RequestInit = {}) =>
    app.fetch(
      new Request(`http://localhost${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', 'Cookie': cookies },
      }),
    );
  const { gameId } = await (await request('/api/games', {
    method: 'POST',
    body: JSON.stringify({}),
  })).json();
  const before = (await (await request(`/api/games/${gameId}`)).json()).game;

  // Can't start with only one player
  const startGame = createAction(ActionTypes.START_GAME, {});
  const response = await request(`/api/games/${gameId}`, {
    method: 'POST',
    body: JSON.stringify({ action: startGame }),
  });
  assertEquals(response.status, 400);
  assertEquals((await response.json()).error, "Can't start game without minimum of 2 players");

  const after = (await (await request(`/api/games/${gameId}`)).json()).game;
  assertEquals(after.lastUpdated, before.lastUpdated);
  assertEquals(after.error, undefined);
});
