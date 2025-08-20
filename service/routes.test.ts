import { testClient } from "hono/testing";
import { assertEquals } from "jsr:@std/assert";
// import { expect } from "jsr:@std/expect";

import { app } from "./main.ts";

// import {
//   ActionTypes,
//   type AddPlayerAction,
//   type StartGameAction,
// } from "../shared/types/index.ts";
// import { app } from "./main.ts";

const login = async (client: any): Promise<string[]> => {
  const response = await client.api.login.$post({
    headers: {
      "Content-Type": "application/json",
    },
    body: { email: "test@localhost.com" },
  });
  return response.headers.getSetCookie() || [];
};

Deno.test("POST /api/login logs in", async () => {
  const client = testClient(app);
  const response = await client.api.login.$post({
    headers: {
      "Content-Type": "application/json",
    },
    json: { email: "test@localhost.com" },
  });
  assertEquals(response.status, 200);
  const data = await response.json();
  assertEquals((data as { email: string }).email, "test@localhost.com");
});

Deno.test("POST /login invalid email does not log in", async () => {
  const client = testClient(app);
  const response = await client.api.login.$post({
    headers: {
      "Content-Type": "application/json",
    },
    json: { email: "super@fly.com" },
  });
  assertEquals(response.status, 403);
});

Deno.test("GET /games returns empty game list", async () => {
  const client = testClient(app);
  const cookies = await login(client);

  const response = await client.api.games.$get({
    "Cookie": cookies,
  });
  assertEquals(response.status, 200);
  const bodyJson = await response.json();
  assertEquals(bodyJson.games.length, 0);
});

// Deno.test("GET /games returns game list", async () => {
//   const app = new Application();
//   // Use routes
//   app.use(router.routes());
//   const cookies = await login(app);

//   // Create game 1
//   const request = await superoak(app);
//   const createResponse = await request
//     .post("/api/games")
//     .set("Cookie", cookies)
//     .set("Content-Type", "application/json")
//     .send('{"player":"superoak"}');
//   const { gameId: game1 } = await createResponse.body;

//   // Create game 2
//   const request2 = await superoak(app);
//   const createResponse2 = await request2
//     .post("/api/games")
//     .set("Cookie", cookies)
//     .set("Content-Type", "application/json")
//     .send('{"player":"superoak"}');
//   const { gameId: game2 } = await createResponse2.body;

//   const getRequest = await superoak(app);
//   const getResponse = await getRequest.get("/api/games")
//     .set("Cookie", cookies);
//   assertEquals(getResponse.status, 200);
//   const { games } = await getResponse.body;
//   assertEquals(games.length, 2);
//   assertEquals(games.map((g: { id: string }) => g.id), [game1, game2]);
// });

// Deno.test("POST /games fails without player name", async () => {
//   const app = new Application();
//   // Use routes
//   app.use(router.routes());
//   const cookies = await login(app);

//   const request = await superoak(app);
//   const response = await request
//     .post("/api/games")
//     .set("Cookie", cookies)
//     .set("Content-Type", "application/json")
//     .send('{"bogus":"content"}');
//   const bodyJson = await response.body;
//   assertEquals(response.status, 400);
//   assertEquals(bodyJson, { error: "Player name is required" });
// });

// Deno.test("POST /games creates a game and returns the id", async () => {
//   const app = new Application();
//   // Use routes
//   app.use(router.routes());
//   const cookies = await login(app);

//   const request = await superoak(app);
//   const response = await request
//     .post("/api/games")
//     .set("Cookie", cookies)
//     .set("Content-Type", "application/json")
//     .send('{"player":"superoak"}');
//   const bodyJson = await response.body;
//   assertEquals(response.status, 201);
//   expect(bodyJson.gameId).toEqual(expect.any(String));
// });

// Deno.test("GET /games/:id gets a game", async () => {
//   const app = new Application();
//   // Use routes
//   app.use(router.routes());
//   app.use(router.allowedMethods());
//   const cookies = await login(app);

//   const request = await superoak(app);

//   // Create a game
//   const createResponse = await request
//     .post("/api/games")
//     .set("Cookie", cookies)
//     .set("Content-Type", "application/json")
//     .send('{"player":"superoak"}');
//   const { gameId } = await createResponse.body;

//   // Verify game exists
//   const getRequest = await superoak(app);
//   const getResponse = await getRequest.get(`/api/games/${gameId}`)
//     .set("Cookie", cookies);
//   assertEquals(getResponse.status, 200);
// });

// Deno.test("DELETE /games/:id deletes a game", async () => {
//   const app = new Application();
//   // Use routes
//   app.use(router.routes());
//   app.use(router.allowedMethods());
//   const cookies = await login(app);

//   const request = await superoak(app);

//   // Create a game
//   const createResponse = await request
//     .post("/api/games")
//     .set("Cookie", cookies)
//     .set("Content-Type", "application/json")
//     .send('{"player":"superoak"}');
//   const { gameId } = await createResponse.body;

//   // Delete the game
//   const deleteRequest = await superoak(app);
//   await deleteRequest
//     .delete(`/api/games/${gameId}`)
//     .set("Cookie", cookies)
//     .expect(204);

//   // Verify game no longer exists
//   const getRequest2 = await superoak(app);
//   await getRequest2.get(`/games/${gameId}`)
//     .set("Cookie", cookies)
//     .expect(404);
// });

// Deno.test("POST /games/:id performs actions", async () => {
//   const app = new Application();
//   // Use routes
//   app.use(router.routes());
//   app.use(router.allowedMethods());
//   const cookies = await login(app);

//   const request = await superoak(app);

//   // Create a game
//   const createResponse = await request
//     .post("/api/games")
//     .set("Cookie", cookies)
//     .set("Content-Type", "application/json")
//     .send('{"player":"superoak"}');
//   const { gameId } = await createResponse.body;

//   // Add player
//   const addPlayer: AddPlayerAction = {
//     type: ActionTypes.ADD_PLAYER,
//     payload: { player: "notsosuperoak" },
//   };
//   const postBody = { action: addPlayer };
//   const postRequest = await superoak(app);
//   const postResponse = await postRequest
//     .post(`/api/games/${gameId}`)
//     .set("Cookie", cookies)
//     .set("Content-Type", "application/json")
//     .send(JSON.stringify(postBody));
//   assertEquals(postResponse.status, 200);

//   const startGame: StartGameAction = {
//     type: ActionTypes.START_GAME,
//     payload: { player: "superoak" },
//   };
//   const startBody = { action: startGame };
//   const startRequest = await superoak(app);
//   const startResponse = await startRequest
//     .post(`/api/games/${gameId}`)
//     .set("Cookie", cookies)
//     .set("Content-Type", "application/json")
//     .send(JSON.stringify(startBody));
//   assertEquals(startResponse.status, 200);
// });
