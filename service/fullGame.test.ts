import { Hono } from 'hono';
import { assertEquals } from '@std/assert';

import {
  type ClientAction,
  GamePhase,
  type GameState,
  type HOTEL_NAME,
  HOTEL_NAMES,
  type PlayerStats,
  type PlayerView,
  type Tile,
} from '@acquire/engine/types';
import { setRoutes } from './routes.ts';
import { saveGameState } from './dataLayer.ts';
import { clearCache } from './auth.ts';
import type { ServiceEnv } from './types.ts';

// Plays the end of a game through the HTTP API as two logged-in players, checking what each of
// them sees along the way: a tied merger, both stockholders resolving, buying, and game over.

clearCache();
Deno.env.set('ALLOWED_EMAILS', 'TestUser:test@example.com, Admin:admin@test.com');

// Build the app from the routes rather than importing main.ts, which starts a server
const app = new Hono<ServiceEnv>();
setRoutes(app);

const login = async (email: string) => {
  const response = await app.fetch(
    new Request('http://localhost/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }),
  );
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
  const request = (path: string, init: RequestInit = {}) =>
    app.fetch(
      new Request(`http://localhost${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', 'Cookie': cookies },
      }),
    );
  return {
    request,
    leaderboard: async (): Promise<PlayerStats[]> =>
      (await (await request('/api/leaderboard')).json()).players,
    view: async (gameId: string): Promise<PlayerView> =>
      (await (await request(`/api/games/${gameId}`)).json()).game,
    act: (gameId: string, action: ClientAction) =>
      request(`/api/games/${gameId}`, { method: 'POST', body: JSON.stringify({ action }) }),
  };
};

const shares = (owners: number[]) =>
  Array.from(
    { length: 25 },
    (_, i) => ({ location: i < owners.length ? owners[i] : 'bank' as const }),
  );

const row = (hotel: HOTEL_NAME, r: number, count: number): Tile[] =>
  Array.from({ length: count }, (_, col) => ({ row: r, col, location: 'board', hotel }));

// Tower (row A) and Luxor (row C) have 5 tiles each. TestUser's 1B joins them, which ties them for
// largest, and the merged hotel has 11 tiles, making Tower the only hotel on the board and safe.
const seededGame = (gameId: string): GameState => ({
  gameId,
  owner: 'TestUser',
  currentPhase: GamePhase.PLAY_TILE,
  currentTurn: 6,
  currentPlayer: 0,
  lastUpdated: 1,
  players: [
    { id: 0, name: 'TestUser', money: 3000 },
    { id: 1, name: 'Admin', money: 3000 },
  ],
  hotels: HOTEL_NAMES.map((name) => ({
    name,
    shares: name === 'Tower'
      ? shares([0, 0, 1])
      : name === 'Luxor'
      ? shares([1, 1, 0])
      : shares([]),
  })),
  tiles: [
    ...row('Tower', 0, 5),
    ...row('Luxor', 2, 5),
    { row: 1, col: 0, location: 0 },
    ...Array.from({ length: 5 }, (_, col) => ({ row: 8, col: col + 6, location: 0 as const })),
    ...Array.from({ length: 6 }, (_, col) => ({ row: 6, col: col + 6, location: 1 as const })),
    ...Array.from({ length: 6 }, (_, col) => ({ row: 4, col: col + 6, location: 'bag' as const })),
  ],
});

Deno.test('full game over HTTP: tied merger through game over', async (t) => {
  const testUser = await login('test@example.com');
  const admin = await login('admin@test.com');

  const createResponse = await testUser.request('/api/games', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const { gameId } = await createResponse.json();
  await saveGameState(seededGame(gameId));

  let lastUpdated = 1;
  // Every action moves lastUpdated forward, which is how polling clients notice changes
  const expectUpdated = async () => {
    const view = await admin.view(gameId);
    assertEquals(view.lastUpdated > lastUpdated, true);
    lastUpdated = view.lastUpdated;
  };

  await t.step('playing the joining tile asks TestUser to break the tie', async () => {
    const response = await testUser.act(gameId, {
      type: 'PLAY_TILE',
      payload: { tile: { row: 1, col: 0 } },
    });
    assertEquals(response.status, 200);
    await expectUpdated();
    for (const player of [testUser, admin]) {
      const view = await player.view(gameId);
      assertEquals(view.currentPhase, GamePhase.BREAK_MERGER_TIE);
      assertEquals(view.currentPlayer, 0);
      assertEquals([...view.mergerTieContext!.tiedHotels].sort(), ['Luxor', 'Tower']);
    }
  });

  await t.step('only the merging player can break the tie', async () => {
    const response = await admin.act(gameId, {
      type: 'BREAK_MERGER_TIE',
      payload: { resolvedTie: { survivor: 'Luxor', merged: 'Tower' } },
    });
    assertEquals(response.status, 400);
  });

  await t.step('breaking the tie pays bonuses and starts with the merging player', async () => {
    const response = await testUser.act(gameId, {
      type: 'BREAK_MERGER_TIE',
      payload: { resolvedTie: { survivor: 'Tower', merged: 'Luxor' } },
    });
    assertEquals(response.status, 200);
    await expectUpdated();

    const mine = await testUser.view(gameId);
    assertEquals(mine.currentPhase, GamePhase.RESOLVE_MERGER);
    assertEquals(mine.pendingMergePlayer, 0);
    assertEquals(mine.mergeContext?.survivingHotel, 'Tower');
    assertEquals(mine.mergeContext?.mergedHotel, 'Luxor');
    assertEquals(mine.mergeContext?.mergedHotelSize, 5);
    assertEquals(mine.mergeContext?.stockholderIds, [0, 1]);
    // Luxor at 5 tiles: $5000 majority to Admin, $2500 minority to TestUser
    assertEquals(mine.money, 3000 + 2500);
    assertEquals(mine.hotels.Tower.size, 11);
    assertEquals(mine.hotels.Luxor.size, 0);

    // Admin sees the same merger but only a cash tier for TestUser
    const theirs = await admin.view(gameId);
    assertEquals(theirs.pendingMergePlayer, 0);
    assertEquals(theirs.money, 3000 + 5000);
    assertEquals(theirs.players[0].money, 3);
  });

  await t.step('stockholders resolve in turn, and only in turn', async () => {
    const early = await admin.act(gameId, {
      type: 'RESOLVE_MERGER',
      payload: { shares: { sell: 0, trade: 2 } },
    });
    assertEquals(early.status, 400);

    const sell = await testUser.act(gameId, {
      type: 'RESOLVE_MERGER',
      payload: { shares: { sell: 1, trade: 0 } },
    });
    assertEquals(sell.status, 200);
    await expectUpdated();
    const afterSell = await admin.view(gameId);
    assertEquals(afterSell.pendingMergePlayer, 1);
    assertEquals(afterSell.mergeContext?.stockholderIds, [1]);
    // Sold at Luxor's pre-merger price
    assertEquals((await testUser.view(gameId)).money, 3000 + 2500 + 500);

    const trade = await admin.act(gameId, {
      type: 'RESOLVE_MERGER',
      payload: { shares: { sell: 0, trade: 2 } },
    });
    assertEquals(trade.status, 200);
    await expectUpdated();
    const afterTrade = await admin.view(gameId);
    assertEquals(afterTrade.stocks, { Tower: 2 } as Record<HOTEL_NAME, number>);
    assertEquals(afterTrade.currentPhase, GamePhase.BUY_SHARES);
    assertEquals(afterTrade.currentPlayer, 0);
    assertEquals(afterTrade.pendingMergePlayer, undefined);
  });

  // Other tests may have finished games too, so the leaderboard checks below look at the change
  const stats = async () =>
    Object.fromEntries((await testUser.leaderboard()).map(({ name, ...totals }) => [name, totals]));
  const none = { gamesPlayed: 0, gamesWon: 0, earnings: 0 };
  const before = await stats();

  await t.step('buying the last share ends the game with Tower the only, safe hotel', async () => {
    const response = await testUser.act(gameId, {
      type: 'BUY_SHARES',
      payload: { shares: { Tower: 1 } as Record<HOTEL_NAME, number> },
    });
    assertEquals(response.status, 200);
    await expectUpdated();

    // Tower at 11 tiles is $700 a share, $7000 majority, $3500 minority.
    // TestUser: 6000 - 700 bought + 7000 majority + 3 shares sold = 14400
    // Admin: 8000 + 3500 minority + 2 shares sold = 12900
    const standings = [{ name: 'TestUser', money: 14400 }, { name: 'Admin', money: 12900 }];
    for (const player of [testUser, admin]) {
      const view = await player.view(gameId);
      assertEquals(view.currentPhase, GamePhase.GAME_OVER);
      assertEquals(view.finalStandings, standings);
    }

    const log = (await testUser.view(gameId)).actions.map(({ action }) => action);
    for (
      const entry of [
        'TestUser merged Luxor into Tower',
        'Admin was paid $5000',
        'TestUser sold 1 shares of Luxor for $500',
        'Admin traded 2 shares of Luxor for 1 of Tower',
        'TestUser bought 1 Tower',
        'TestUser finished with $14400',
        'Admin finished with $12900',
      ]
    ) {
      assertEquals(log.includes(entry), true, `missing log entry: ${entry}`);
    }
  });

  await t.step('the finished game counts once on the leaderboard', async () => {
    // A move after game over is rejected, and doesn't count the game again
    const late = await admin.act(gameId, {
      type: 'BUY_SHARES',
      payload: { shares: {} as Record<HOTEL_NAME, number> },
    });
    assertEquals(late.status, 400);

    const after = await stats();
    const change = (name: string) => {
      const was = before[name] ?? none;
      return {
        gamesPlayed: after[name].gamesPlayed - was.gamesPlayed,
        gamesWon: after[name].gamesWon - was.gamesWon,
        earnings: after[name].earnings - was.earnings,
      };
    };
    assertEquals(change('TestUser'), { gamesPlayed: 1, gamesWon: 1, earnings: 14400 });
    assertEquals(change('Admin'), { gamesPlayed: 1, gamesWon: 0, earnings: 12900 });
    // Admin sees the same leaderboard
    assertEquals(await admin.leaderboard(), await testUser.leaderboard());
  });

  await testUser.request(`/api/games/${gameId}`, { method: 'DELETE' });
});
