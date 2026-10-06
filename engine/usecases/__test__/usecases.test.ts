import {
  assertEquals,
  assertExists,
  assertThrows,
} from 'https://deno.land/std@0.203.0/assert/mod.ts';

import {
  addPlayerUseCase,
  breakMergerTieUseCase,
  buySharesUseCase,
  foundHotelUseCase,
  playTileUseCase,
  removePlayerUseCase,
  resolveMergerUseCase,
  startGameUseCase,
} from '../index.ts';

import { GamePhase, type GameState } from '../../types/index.ts';

const makeBaseState = (overrides: Partial<GameState> = {}): GameState => ({
  gameId: 'g1',
  owner: 'owner',
  currentPhase: GamePhase.WAITING_FOR_PLAYERS,
  currentTurn: 0,
  currentPlayer: 0,
  lastUpdated: Date.now(),
  players: [],
  hotels: [],
  tiles: [],
  ...overrides,
});

Deno.test('addPlayerUseCase: adds a player during waiting phase', () => {
  const state = makeBaseState();
  const [result, actions] = addPlayerUseCase(
    state,
    { type: 'ADD_PLAYER', payload: { player: 'Alice' } } as any,
  );
  assertExists(result.players);
  assertEquals(result.players.length, 1);
  assertEquals(result.players[0].name, 'Alice');
});

Deno.test('addPlayerUseCase: throws when not in waiting phase', () => {
  const state = makeBaseState({ currentPhase: GamePhase.PLAY_TILE });
  assertThrows(() =>
    addPlayerUseCase(state, { type: 'ADD_PLAYER', payload: { player: 'Alice' } } as any)
  );
});

Deno.test('removePlayerUseCase: removes an existing player during waiting phase', () => {
  const state = makeBaseState({
    players: [{ id: 0, name: 'Alice', money: 0 }, { id: 1, name: 'Bob', money: 0 }],
  });
  const [result, actions] = removePlayerUseCase(
    state,
    { type: 'REMOVE_PLAYER', payload: { player: 'Bob' } } as any,
  );
  assertEquals(result.players.length, 1);
  assertEquals(result.players[0].name, 'Alice');
});

Deno.test('removePlayerUseCase: throws when not in waiting phase', () => {
  const state = makeBaseState({
    currentPhase: GamePhase.PLAY_TILE,
    players: [{ id: 0, name: 'Alice', money: 0 }],
  });
  assertThrows(() =>
    removePlayerUseCase(state, { type: 'REMOVE_PLAYER', payload: { player: 'Alice' } } as any)
  );
});

Deno.test('startGameUseCase: only owner can start and moves to PLAY_TILE', () => {
  // provide minimal tiles so start orchestration can run
  const tiles = [];
  for (let r = 0; r < 20; r++) tiles.push({ row: r, col: 0, location: 'bag' } as any);
  const state = makeBaseState({
    players: [{ id: -1, name: 'owner', money: 0 }, { id: -1, name: 'p2', money: 0 }],
    tiles,
  });
  const [result, actions] = startGameUseCase(
    state,
    { type: 'START_GAME', payload: { player: 'owner' } } as any,
  );
  assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
  assertEquals(result.currentPlayer, 0);
});

Deno.test('startGameUseCase: throws if non-owner attempts to start', () => {
  const state = makeBaseState({
    players: [{ id: -1, name: 'owner', money: 0 }, { id: -1, name: 'p2', money: 0 }],
  });
  assertThrows(() =>
    startGameUseCase(state, { type: 'START_GAME', payload: { player: 'p2' } } as any)
  );
});

// Generic validation/error branch tests for phases and turn checks
Deno.test('buySharesUseCase: logs the purchase before the next turn', async (t) => {
  const makeState = () =>
    makeBaseState({
      currentPhase: GamePhase.BUY_SHARES,
      currentTurn: 3,
      players: [
        { id: 0, name: 'Alice', money: 6000 },
        { id: 1, name: 'Bob', money: 6000 },
      ],
      hotels: ['Tower', 'Luxor', 'American'].map((name) => ({
        name,
        shares: Array.from({ length: 25 }, () => ({ location: 'bank' })),
      })) as any,
      tiles: [
        { row: 0, col: 0, location: 'board', hotel: 'Tower' },
        { row: 0, col: 1, location: 'board', hotel: 'Tower' },
        { row: 2, col: 0, location: 'board', hotel: 'Luxor' },
        { row: 2, col: 1, location: 'board', hotel: 'Luxor' },
        ...Array.from({ length: 5 }, (_, col) => ({ row: 8, col, location: 0 })),
        ...Array.from({ length: 6 }, (_, col) => ({ row: 7, col, location: 1 })),
        ...Array.from({ length: 4 }, (_, col) => ({ row: 5, col, location: 'bag' })),
      ] as any,
    });

  await t.step('lists each hotel bought', () => {
    const [, actions] = buySharesUseCase(makeState(), {
      type: 'BUY_SHARES',
      payload: { player: 'Alice', shares: { Tower: 2, Luxor: 1 } as any },
    });
    assertEquals(actions[0], { turn: 3, player: 0, action: 'Alice bought 2 Tower, 1 Luxor' });
  });

  await t.step('says when nothing was bought', () => {
    const [state, actions] = buySharesUseCase(makeState(), {
      type: 'BUY_SHARES',
      payload: { player: 'Alice', shares: {} as any },
    });
    assertEquals(actions[0].action, "Alice didn't buy any shares");
    assertEquals(state.currentPlayer, 1);
  });
});

Deno.test('buySharesUseCase: throws when not player turn', () => {
  const state = makeBaseState({
    currentPhase: GamePhase.BUY_SHARES,
    players: [{ id: 0, name: 'Alice', money: 0 }, { id: 1, name: 'Bob', money: 0 }],
    currentPlayer: 0,
  });
  assertThrows(() =>
    buySharesUseCase(state, { type: 'BUY_SHARES', payload: { player: 'Bob', shares: {} } } as any)
  );
});

Deno.test('playTileUseCase: throws when not player turn', () => {
  const state = makeBaseState({
    currentPhase: GamePhase.PLAY_TILE,
    players: [{ id: 0, name: 'Alice', money: 0 }, { id: 1, name: 'Bob', money: 0 }],
    currentPlayer: 0,
  });
  assertThrows(() =>
    playTileUseCase(
      state,
      { type: 'PLAY_TILE', payload: { player: 'Bob', tile: { row: 0, col: 0 } } } as any,
    )
  );
});

Deno.test('foundHotelUseCase: throws when not player turn', () => {
  const state = makeBaseState({
    currentPhase: GamePhase.FOUND_HOTEL,
    players: [{ id: 0, name: 'Alice', money: 0 }, { id: 1, name: 'Bob', money: 0 }],
    currentPlayer: 0,
  });
  assertThrows(() =>
    foundHotelUseCase(
      state,
      { type: 'FFound Hotel', payload: { player: 'Bob', hotelName: 'Tower' } } as any,
    )
  );
});

Deno.test('resolveMergerUseCase: throws when not in resolve phase', () => {
  const state = makeBaseState({ currentPhase: GamePhase.PLAY_TILE });
  assertThrows(() =>
    resolveMergerUseCase(
      state,
      { type: 'RESOLVE_MERGER', payload: { player: 'Alice', shares: {} } } as any,
    )
  );
});

Deno.test('breakMergerTieUseCase: throws when not in break-tie phase or not player turn', () => {
  const state = makeBaseState({
    currentPhase: GamePhase.PLAY_TILE,
    players: [{ id: 0, name: 'Alice', money: 0 }, { id: 1, name: 'Bob', money: 0 }],
    currentPlayer: 0,
  });
  assertThrows(() =>
    breakMergerTieUseCase(
      state,
      { type: 'BREAK_MERGER_TIE', payload: { player: 'Bob', resolvedTie: 'Tower' } } as any,
    )
  );
});
Deno.test('addPlayerUseCase: returns player action record', () => {
  const state = makeBaseState();
  const [result, actions] = addPlayerUseCase(
    state,
    { type: 'ADD_PLAYER', payload: { player: 'Alice' } } as any,
  );

  // Verify actions array is returned
  assertExists(actions);
  assertEquals(Array.isArray(actions), true);

  // Verify action contains description of what happened
  if (actions.length > 0) {
    const action = actions[0];
    assertExists(action.turn);
    assertExists(action.action);
    assertEquals(typeof action.action, 'string');
  }
});
