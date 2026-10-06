import './dom.ts';
import { assertEquals } from '@std/assert';
import { stub } from '@std/testing/mock';

import { GamePhase, type GameView, type PlayerView } from '@acquire/engine/types';
import '../GameBoardView.ts';
import { hotelsWith, makePlayerView, mount, settle } from './fixtures.ts';

type Board = Awaited<ReturnType<typeof mount>> & { pollGameState(): Promise<void> };

// Serves GET /api/games/:id from views (the last one repeats) and records POSTed actions
const serve = (views: GameView[], postResponse?: PlayerView) => {
  const posted: unknown[] = [];
  let next = 0;
  const fetchStub = stub(globalThis, 'fetch', (_input, init?: RequestInit) => {
    if (init?.method === 'POST') {
      posted.push(JSON.parse(String(init.body)).action);
      return Promise.resolve(new Response(JSON.stringify({ game: postResponse })));
    }
    const view = views[Math.min(next++, views.length - 1)];
    return Promise.resolve(new Response(JSON.stringify({ game: view })));
  });
  return { posted, [Symbol.dispose]: () => fetchStub.restore() };
};

const mountBoard = async () => {
  const board = await mount('game-board-view', { gameId: 'test-game', user: 'nate' }) as Board;
  // Let the initial load land
  await settle(board);
  const root = board.shadowRoot!;
  return {
    board,
    root,
    submit: () => root.querySelector('.current-player-view > button') as HTMLButtonElement,
    text: (selector: string) =>
      root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim(),
  };
};

Deno.test('GameBoardView - waits while another player moves', async () => {
  using _server = serve([makePlayerView({ currentPlayer: 1 })]);
  const { board, submit, text } = await mountBoard();
  assertEquals(submit().textContent?.trim(), 'Waiting…');
  assertEquals(submit().disabled, true);
  assertEquals(text('.player-card.active .player-name'), 'alice');
  board.remove();
});

Deno.test('GameBoardView - skip buying until a share is picked', async () => {
  using _server = serve([makePlayerView({
    currentPhase: GamePhase.BUY_SHARES,
    hotels: hotelsWith({ Tower: { shares: 20, size: 3 } }),
  })]);
  const { board, root, submit } = await mountBoard();
  assertEquals(submit().textContent?.trim(), 'Skip buying');
  assertEquals(submit().disabled, false);

  const card = root.querySelector('action-card')! as HTMLElement & { updateComplete: Promise<boolean> };
  (card.shadowRoot!.querySelector('button[aria-label="Tower more"]') as HTMLButtonElement).click();
  await settle(card);
  await settle(board);
  assertEquals(submit().textContent?.trim(), 'Submit');
  board.remove();
});

Deno.test('GameBoardView - submitting posts the action and shows the result', async () => {
  const afterMove = makePlayerView({ currentPlayer: 1, lastUpdated: 200 });
  using server = serve([
    makePlayerView({ currentPhase: GamePhase.BUY_SHARES, hotels: hotelsWith() }),
  ], afterMove);
  const { board, submit } = await mountBoard();
  submit().click();
  await settle(board);
  await settle(board);
  assertEquals(server.posted, [{ type: 'BUY_SHARES', payload: { player: 'nate', shares: {} } }]);
  assertEquals(submit().textContent?.trim(), 'Waiting…');
  board.remove();
});

Deno.test('GameBoardView - unplayable tiles are disabled with the reason', async () => {
  using _server = serve([makePlayerView({
    tiles: [{ row: 0, col: 0 }, { row: 5, col: 1, unplayable: 'it would merge two safe hotels' }],
  })]);
  const { board, root } = await mountBoard();
  const tiles = [...root.querySelectorAll('.tile')] as HTMLButtonElement[];
  assertEquals(tiles.map((tile) => [tile.textContent?.trim(), tile.disabled]), [
    ['1A', false],
    ['2F', true],
  ]);
  assertEquals(tiles[1].title, "Can't be played: it would merge two safe hotels");
  board.remove();
});

Deno.test('GameBoardView - game over shows the standings instead of the controls', async () => {
  using _server = serve([makePlayerView({
    currentPhase: GamePhase.GAME_OVER,
    finalStandings: [{ name: 'alice', money: 19800 }, { name: 'nate', money: 10100 }],
  })]);
  const { board, root, text } = await mountBoard();
  assertEquals(text('.game-over-headline'), 'alice wins');
  assertEquals(
    [...root.querySelectorAll('.standings li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim()),
    ['1. alice $19,800', '2. nate You $10,100'],
  );
  assertEquals(root.querySelector('action-card'), null);
  assertEquals(root.querySelector('.player-card.active'), null);
  board.remove();
});

Deno.test('GameBoardView - polling only applies newer states', async () => {
  const start = makePlayerView({ currentPlayer: 1, lastUpdated: 100 });
  using _server = serve([
    start,
    // A slow response from before the current state
    makePlayerView({ currentPlayer: 0, lastUpdated: 50 }),
    // Alice finished her turn
    makePlayerView({ currentPlayer: 0, lastUpdated: 150 }),
  ]);
  const { board, submit } = await mountBoard();
  assertEquals(submit().textContent?.trim(), 'Waiting…');

  await board.pollGameState();
  await settle(board);
  assertEquals(submit().textContent?.trim(), 'Waiting…');

  await board.pollGameState();
  await settle(board);
  assertEquals((board.playerView as PlayerView).lastUpdated, 150);
  assertEquals(submit().disabled, true); // nothing selected yet on the new turn
  assertEquals(submit().textContent?.trim(), 'Submit');
  board.remove();
});

Deno.test('GameBoardView - the status line says whose move it is', async () => {
  using _server = serve([
    makePlayerView({ currentPlayer: 1 }),
    makePlayerView({ currentPlayer: 0, lastUpdated: 150 }),
  ]);
  const { board, root, text } = await mountBoard();
  assertEquals(text('.game-status'), 'Waiting for alice to play a tile');
  assertEquals(root.querySelector('.game-status.your-move'), null);

  await board.pollGameState();
  await settle(board);
  assertEquals(text('.game-status.your-move'), 'Your turn: play a tile');
  board.remove();
});

Deno.test('GameBoardView - polls as soon as the tab is visible again', async () => {
  using _server = serve([
    makePlayerView({ currentPlayer: 1, lastUpdated: 100 }),
    makePlayerView({ currentPlayer: 0, lastUpdated: 150 }),
  ]);
  const { board, text } = await mountBoard();

  // Hidden tabs don't poll
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
  await settle(board);
  assertEquals(text('.game-status'), 'Waiting for alice to play a tile');

  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
  await settle(board);
  await settle(board);
  assertEquals(text('.game-status'), 'Your turn: play a tile');
  board.remove();
});

Deno.test('GameBoardView - the log lists recent moves in order', async () => {
  using _server = serve([makePlayerView({
    actions: [
      { turn: 1, player: 0, action: 'nate played 1A' },
      { turn: 1, player: 1, action: 'alice played 2B' },
    ],
  })]);
  const { board, root } = await mountBoard();
  assertEquals(
    [...root.querySelectorAll('.game-log li')].map((li) => li.textContent?.trim()),
    ['nate played 1A', 'alice played 2B'],
  );
  board.remove();
});

Deno.test("GameBoardView - nobody's move before the game starts", async () => {
  using _server = serve([makePlayerView({ currentPhase: GamePhase.WAITING_FOR_PLAYERS })]);
  const { board, root, text } = await mountBoard();
  assertEquals(text('.game-status'), 'Waiting for the game to start');
  assertEquals(root.querySelector('.game-status.your-move'), null);
  assertEquals(root.querySelector('.player-card.active'), null);
  board.remove();
});

Deno.test('GameBoardView - spectators watch without a hand or controls', async () => {
  const { playerId: _, money: _money, stocks: _stocks, tiles: _tiles, ...game } = makePlayerView({
    currentPlayer: 1,
  });
  using _server = serve([game]);
  const { board, root, text } = await mountBoard();
  assertEquals(text('.game-status'), 'Waiting for alice to play a tile');
  assertEquals(text('.spectating'), "You're watching this game");
  assertEquals(root.querySelector('.current-player-view'), null);
  assertEquals(root.querySelector('action-card'), null);
  assertEquals(root.querySelector('.you-badge'), null);
  assertEquals(root.querySelectorAll('.player-card').length, 2);
  board.remove();
});
