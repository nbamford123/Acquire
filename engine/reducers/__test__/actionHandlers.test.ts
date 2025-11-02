import { actionHandlers } from '../actionHandlers.ts';
import { assert } from 'https://deno.land/std@0.203.0/assert/mod.ts';

Deno.test('actionHandlers: has handlers for all action types', () => {
  const actionTypes = [
    'ADD_PLAYER',
    'REMOVE_PLAYER',
    'START_GAME',
    'PLAY_TILE',
    'BUY_SHARES',
    'FOUND_HOTEL',
    'RESOLVE_MERGER',
    'BREAK_MERGER_TIE',
  ];
  for (const type of actionTypes) {
    assert(type in actionHandlers, `Missing handler for ${type}`);
  }
});
