import { assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { advanceTurnOrchestrator } from '../advanceTurnOrchestrator.ts';
import { GamePhase } from '../../types/index.ts';

Deno.test('advanceTurnOrchestrator advances player and keeps turn count', () => {
  const players = [
    { id: 0, name: 'P0' },
    { id: 1, name: 'P1' },
  ] as unknown as any[];

  const tiles = [
    { row: 0, col: 0, location: 'bag' },
    { row: 0, col: 1, location: 'bag' },
    { row: 0, col: 2, location: 'bag' },
    // Hands away from the board so every tile is playable
    ...Array.from({ length: 5 }, (_, col) => ({ row: 8, col, location: 0 })),
    ...Array.from({ length: 6 }, (_, col) => ({ row: 7, col, location: 1 })),
  ] as unknown as any[];

  const baseState = {
    gameId: 'g',
    owner: 'o',
    currentPhase: GamePhase.PLAY_TILE,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players,
    hotels: [
      { name: 'Tower', shares: Array.from({ length: 25 }, () => ({ location: 'bank' })) },
      { name: 'Luxor', shares: Array.from({ length: 25 }, () => ({ location: 'bank' })) },
    ],
    tiles,
  } as unknown as any;

  const [result, actions] = advanceTurnOrchestrator(baseState);
  // Next player should be 1
  assertEquals(result.currentPlayer, 1);
  // Turn should remain 1 because nextPlayerId !== 0
  assertEquals(result.currentTurn, 1);
  // Phase should be set to PLAY_TILE
  assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
});

// Every hotel is on the board (2 tiles each in rows 0-6 at the right edge), with loose tiles along
// row I. A tile next to a loose tile would found an 8th hotel, so it can't be played.
const HOTELS = ['Worldwide', 'Luxor', 'Festival', 'Imperial', 'American', 'Continental', 'Tower'];
const unplayable = [1, 2, 4, 5, 7, 8].map((col) => ({ row: 8, col }));
const playable = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ row: 2 + Math.floor(i / 6), col: i % 6 }));

const makeState = (config: {
  p0Hand: { row: number; col: number }[];
  p1Hand: { row: number; col: number }[];
  bag: { row: number; col: number }[];
  p1Money?: number;
}) =>
  ({
    gameId: 'g',
    owner: 'o',
    currentPhase: GamePhase.BUY_SHARES,
    currentTurn: 4,
    currentPlayer: 0,
    lastUpdated: 0,
    players: [
      { id: 0, name: 'P0', money: 0 },
      { id: 1, name: 'P1', money: config.p1Money ?? 0 },
    ],
    hotels: HOTELS.map((name) => ({
      name,
      shares: Array.from({ length: 25 }, () => ({ location: 'bank' })),
    })),
    tiles: [
      ...HOTELS.flatMap((hotel, row) => [
        { row, col: 10, location: 'board', hotel },
        { row, col: 11, location: 'board', hotel },
      ]),
      ...[0, 3, 6, 9].map((col) => ({ row: 8, col, location: 'board' })),
      ...config.p0Hand.map((tile) => ({ ...tile, location: 0 })),
      ...config.p1Hand.map((tile) => ({ ...tile, location: 1 })),
      ...config.bag.map((tile) => ({ ...tile, location: 'bag' })),
    ],
  }) as unknown as any;

const handOf = (state: any, playerId: number) =>
  state.tiles.filter((tile: any) => tile.location === playerId);
const text = (actions: { action: string }[]) => actions.map(({ action }) => action);

Deno.test('advanceTurnOrchestrator - unplayable hands', async (t) => {
  await t.step('redraws a hand with no playable tiles', () => {
    // P0 placed a tile, so draws 1 of the 7 bag tiles, leaving 6 for P1's new hand
    const [state, actions] = advanceTurnOrchestrator(
      makeState({ p0Hand: playable(5), p1Hand: unplayable, bag: playable(12).slice(5) }),
    );
    assertEquals(state.currentPlayer, 1);
    assertEquals(state.currentPhase, GamePhase.PLAY_TILE);
    assertEquals(handOf(state, 1).length, 6);
    assertEquals(state.tiles.filter((tile: any) => tile.location === 'dead').length, 6);
    assertEquals(text(actions), ['P1 had no playable tiles and drew a new hand']);
  });

  await t.step('skips placing a tile and goes to buying when the new hand is no better', () => {
    // The only bag tile goes to P0, so P1's redraw comes up empty
    const [state, actions] = advanceTurnOrchestrator(
      makeState({
        p0Hand: playable(5),
        p1Hand: unplayable,
        bag: playable(6).slice(5),
        p1Money: 6000,
      }),
    );
    assertEquals(state.currentPlayer, 1);
    assertEquals(state.currentPhase, GamePhase.BUY_SHARES);
    assertEquals(text(actions), [
      'P1 had no playable tiles and discarded them, with none left to draw',
      'P1 has no playable tiles and skips placing one',
    ]);
  });

  await t.step('passes the turn on when the player also can not buy', () => {
    const [state, actions] = advanceTurnOrchestrator(
      makeState({ p0Hand: playable(5), p1Hand: unplayable, bag: playable(6).slice(5) }),
    );
    // Back to P0, whose hand is playable, on the next turn
    assertEquals(state.currentPlayer, 0);
    assertEquals(state.currentTurn, 5);
    assertEquals(state.currentPhase, GamePhase.PLAY_TILE);
    assertEquals(text(actions).at(-1), 'P1 has no playable tiles and skips placing one');
  });

  await t.step('ends the game when nobody can play or buy', () => {
    const [state, actions] = advanceTurnOrchestrator(
      makeState({ p0Hand: unplayable.slice(0, 5), p1Hand: [], bag: [] }),
    );
    assertEquals(state.currentPhase, GamePhase.GAME_OVER);
    assertEquals(text(actions).includes('No one can play, so the game is over'), true);
  });
});
