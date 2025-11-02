import { rootReducer } from '../rootReducer.ts';
import { assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { GameAction, GamePhase, GameState } from '../../types/index.ts';

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
