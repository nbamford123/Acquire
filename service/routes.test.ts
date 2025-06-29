import { Application } from 'jsr:@oak/oak@17';
import { superoak } from 'https://deno.land/x/superoak/mod.ts';
import { assertEquals } from 'jsr:@std/assert';
import { expect } from 'jsr:@std/expect';

import { ActionTypes, type AddPlayerAction, type StartGameAction } from '@/types/index.ts';
import { router } from './routes.ts';

const login = async (app: Application): Promise<string[]> => {
  const request = await superoak(app);
  const response = await request.post('/login')
    .set('Content-Type', 'application/json')
    .send('{"email":"test@localhost.com"}');
  return response.headers['set-cookie'] as string[];
};

Deno.test('POST /login logs in', async () => {
  const app = new Application();
  // Use routes
  app.use(router.routes());

  const request = await superoak(app);
  const response = await request.post('/login')
    .set('Content-Type', 'application/json')
    .send('{"email":"test@localhost.com"}');
  assertEquals(response.status, 200);
  const bodyJson = await response.body;
  assertEquals(bodyJson.email, 'test@localhost.com');
});

Deno.test('POST /login invalid email does not log in', async () => {
  const app = new Application();
  // Use routes
  app.use(router.routes());

  const request = await superoak(app);
  const response = await request.post('/login')
    .set('Content-Type', 'application/json')
    .send('{"email":"super@fly.com"}');
  assertEquals(response.status, 403);
});

Deno.test('GET /games returns empty game list', async () => {
  const app = new Application();
  // Use routes
  app.use(router.routes());
  const cookies = await login(app);

  const request = await superoak(app);
  const response = await request.get('/games').set('Cookie', cookies);
  assertEquals(response.status, 200);
  const bodyJson = await response.body;
  assertEquals(bodyJson.games.length, 0);
});

Deno.test('GET /games returns game list', async () => {
  const app = new Application();
  // Use routes
  app.use(router.routes());
  const cookies = await login(app);

  // Create game 1
  const request = await superoak(app);
  const createResponse = await request
    .post('/games')
    .set('Cookie', cookies)
    .set('Content-Type', 'application/json')
    .send('{"player":"superoak"}');
  const { gameId: game1 } = await createResponse.body;

  // Create game 2
  const request2 = await superoak(app);
  const createResponse2 = await request2
    .post('/games')
    .set('Cookie', cookies)
    .set('Content-Type', 'application/json')
    .send('{"player":"superoak"}');
  const { gameId: game2 } = await createResponse2.body;

  const getRequest = await superoak(app);
  const getResponse = await getRequest.get('/games')
    .set('Cookie', cookies);
  assertEquals(getResponse.status, 200);
  const { games } = await getResponse.body;
  assertEquals(games.length, 2);
  assertEquals(games.map((g: { id: string }) => g.id), [game1, game2]);
});

Deno.test('POST /games fails without player name', async () => {
  const app = new Application();
  // Use routes
  app.use(router.routes());
  const cookies = await login(app);

  const request = await superoak(app);
  const response = await request
    .post('/games')
    .set('Cookie', cookies)
    .set('Content-Type', 'application/json')
    .send('{"bogus":"content"}');
  const bodyJson = await response.body;
  assertEquals(response.status, 400);
  assertEquals(bodyJson, { error: 'Player name is required' });
});

Deno.test('POST /games creates a game and returns the id', async () => {
  const app = new Application();
  // Use routes
  app.use(router.routes());
  const cookies = await login(app);

  const request = await superoak(app);
  const response = await request
    .post('/games')
    .set('Cookie', cookies)
    .set('Content-Type', 'application/json')
    .send('{"player":"superoak"}');
  const bodyJson = await response.body;
  assertEquals(response.status, 201);
  expect(bodyJson.gameId).toEqual(expect.any(String));
});

Deno.test('GET /games/:id gets a game', async () => {
  const app = new Application();
  // Use routes
  app.use(router.routes());
  app.use(router.allowedMethods());
  const cookies = await login(app);

  const request = await superoak(app);

  // Create a game
  const createResponse = await request
    .post('/games')
    .set('Cookie', cookies)
    .set('Content-Type', 'application/json')
    .send('{"player":"superoak"}');
  const { gameId } = await createResponse.body;

  // Verify game exists
  const getRequest = await superoak(app);
  const getResponse = await getRequest.get(`/games/${gameId}`)
    .set('Cookie', cookies);
  assertEquals(getResponse.status, 200);
});

Deno.test('DELETE /games/:id deletes a game', async () => {
  const app = new Application();
  // Use routes
  app.use(router.routes());
  app.use(router.allowedMethods());
  const cookies = await login(app);

  const request = await superoak(app);

  // Create a game
  const createResponse = await request
    .post('/games')
    .set('Cookie', cookies)
    .set('Content-Type', 'application/json')
    .send('{"player":"superoak"}');
  const { gameId } = await createResponse.body;

  // Delete the game
  const deleteRequest = await superoak(app);
  await deleteRequest
    .delete(`/games/${gameId}`)
    .set('Cookie', cookies)
    .expect(204);

  // Verify game no longer exists
  const getRequest2 = await superoak(app);
  await getRequest2.get(`/games/${gameId}`)
    .set('Cookie', cookies)
    .expect(404);
});

Deno.test('POST /games/:id performs actions', async () => {
  const app = new Application();
  // Use routes
  app.use(router.routes());
  app.use(router.allowedMethods());
  const cookies = await login(app);

  const request = await superoak(app);

  // Create a game
  const createResponse = await request
    .post('/games')
    .set('Cookie', cookies)
    .set('Content-Type', 'application/json')
    .send('{"player":"superoak"}');
  const { gameId } = await createResponse.body;

  // Add player
  const addPlayer: AddPlayerAction = {
    type: ActionTypes.ADD_PLAYER,
    payload: { player: 'notsosuperoak' },
  };
  const postBody = { action: addPlayer };
  const postRequest = await superoak(app);
  const postResponse = await postRequest
    .post(`/games/${gameId}`)
    .set('Cookie', cookies)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(postBody));
  assertEquals(postResponse.status, 200);

  const startGame: StartGameAction = {
    type: ActionTypes.START_GAME,
    payload: { player: 'superoak' },
  };
  const startBody = { action: startGame };
  const startRequest = await superoak(app);
  const startResponse = await startRequest
    .set('Cookie', cookies)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(startBody));
  assertEquals(startResponse.status, 200);
});
