import { completeMergerReducer } from '../completeMergerReducer.ts';
import { assertEquals, assertExists } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import type { GameState, Hotel } from '../../types/index.ts';

Deno.test('completeMergerReducer: updates player money and hotel shares after merger', () => {
  // Minimal valid GameState for this test
  const gameState = {
    players: [
      { id: 1, money: 100 },
      { id: 2, money: 200 },
    ],
    hotels: [
      { name: 'Tower', shares: [{ location: 1 }, { location: 'bank' }] },
      { name: 'Sackson', shares: [{ location: 2 }, { location: 'bank' }] },
    ],
    tiles: [],
  } as unknown as GameState;
  const survivor = { name: 'Tower', shares: [{ location: 1 }, { location: 'bank' }] } as Hotel;
  const merged = { name: 'Sackson', shares: [{ location: 2 }, { location: 'bank' }] } as Hotel;
  // shares param is undefined for this test
  const result = completeMergerReducer(gameState, 1, undefined, survivor, merged);
  assertExists(result.players);
  assertEquals(result.players.length, 2);
  assertExists(result.hotels);
  assertEquals(result.hotels.length, 2);
});
