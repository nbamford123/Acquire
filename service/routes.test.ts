import type { Hono } from 'hono';
import { assertEquals } from '@std/assert';
import { expect } from '@std/expect';

import { ActionTypes, type AddPlayerAction, type StartGameAction } from '@acquire/engine/types';
import { app } from './main.ts';
import { clearCache } from './auth.ts';
import type { ServiceEnv } from './types.ts';

// Mock environment for testing
clearCache();
Deno.env.set('ALLOWED_EMAILS', 'TestUser:test@example.com, Admin:admin@test.com');

const login = async (app: Hono<ServiceEnv>): Promise<string> => {
  const response = await app.fetch(
    new Request('http://localhost/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@example.com' }),
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
  assertEquals(games.map((g: { id: string }) => g.id), [game1, game2]);
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

  // Add player
  const addPlayer: AddPlayerAction = {
    type: ActionTypes.ADD_PLAYER,
    payload: { player: 'notsosuperoak' },
  };
  const postResponse = await app.fetch(
    new Request(`http://localhost/api/games/${gameId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({ action: addPlayer }),
    }),
  );
  assertEquals(postResponse.status, 200);

  const startGame: StartGameAction = {
    type: ActionTypes.START_GAME,
    payload: { player: 'hono' },
  };
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
