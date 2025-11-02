import { rootReducer } from '../rootReducer.ts';
import { assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { GameAction, GamePhase, GameState } from '../../types/index.ts';
import { GameErrorCodes } from '../../types/index.ts';
import { actionHandlers } from '../actionHandlers.ts';

// Helper to restore mutated handlers after test
const originalHandlers = { ...actionHandlers };

Deno.test('rootReducer: calls correct handler and clears error', () => {
  // Provide a valid state for START_GAME
  const state = {
    error: { code: 'SOME_ERROR', message: 'fail' },
    players: [
      { id: 1, name: 'Alice', money: 6000 },
      { id: 2, name: 'Bob', money: 6000 },
    ],
    hotels: [],
    tiles: [
      { row: 0, col: 0, location: 'bag' },
      { row: 0, col: 1, location: 'bag' },
      { row: 0, col: 2, location: 'bag' },
      { row: 0, col: 3, location: 'bag' },
      { row: 0, col: 4, location: 'bag' },
      { row: 0, col: 5, location: 'bag' },
    ],
    gameId: 'test',
    owner: 1,
    currentPhase: GamePhase.WAITING_FOR_PLAYERS,
    currentTurn: 1,
    currentPlayer: 1,
    log: [],
    lastUpdated: Date.now(),
  } as unknown as GameState;
  const action = { type: 'START_GAME', payload: { player: 1 } } as unknown as GameAction;
  const result = rootReducer(state, action);
  assertEquals(result.error, null);
});

Deno.test('rootReducer: returns GameError when usecase throws', () => {
  const state = {
    error: null,
    players: [{ id: 1 }],
    hotels: [],
    tiles: [],
    gameId: 'test',
    owner: 1,
    currentPhase: GamePhase.WAITING_FOR_PLAYERS,
    currentTurn: 1,
    currentPlayer: 1,
    log: [],
  } as unknown as GameState;

  // Attempt to start game as a non-owner player -> startGameUseCase should throw
  const action = { type: 'START_GAME', payload: { player: 2 } } as unknown as GameAction;
  const result = rootReducer(state, action);
  // Should capture a GameError with GAME_INVALID_ACTION
  assertEquals(result.error?.code, GameErrorCodes.GAME_INVALID_ACTION);
});

Deno.test('rootReducer: handles unknown action type and clears error', () => {
  const state = {
    error: { code: 'SOME_ERROR', message: 'fail' },
    players: [],
    hotels: [],
    tiles: [],
    gameId: 'test',
    owner: 1,
    currentPhase: 'setup',
    currentTurn: 1,
    currentPlayer: 1,
    log: [],
  } as unknown as GameState;
  const action = { type: 'UNKNOWN_ACTION', payload: {} } as unknown as GameAction;
  const result = rootReducer(state, action);
  assertEquals(result.error, null);
});

Deno.test('rootReducer: catches non-GameError and maps to UNKNOWN_ERROR', () => {
  // Inject a temporary handler that throws a plain Error
  // @ts-expect-error mutate for test
  actionHandlers.TEST_THROW = () => {
    throw new Error('boom');
  };

  const state = {
    error: null,
    players: [],
    hotels: [],
    tiles: [],
    gameId: 'test',
    owner: 1,
    currentPhase: 'setup',
    currentTurn: 1,
    currentPlayer: 1,
    log: [],
  } as unknown as GameState;

  const action = { type: 'TEST_THROW', payload: {} } as unknown as GameAction;
  const result = rootReducer(state, action);
  assertEquals(result.error?.code, GameErrorCodes.UNKNOWN_ERROR);

  // restore original handlers
  Object.assign(actionHandlers, originalHandlers);
});
