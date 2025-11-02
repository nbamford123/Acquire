import { buySharesReducer } from '../buySharesReducer.ts';
import { assert, assertEquals, assertExists } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import type { GameState, HOTEL_NAME } from '../../types/index.ts';

Deno.test('buySharesReducer: deducts money and assigns shares to player', () => {
  // Minimal valid GameState for this test
  const gameState = {
    hotels: [
      {
        name: 'Tower',
        shares: [
          { location: 'bank' },
          { location: 'bank' },
          { location: 'bank' },
        ],
      },
    ],
    players: [
      { id: 1, money: 1000 },
      { id: 2, money: 1000 },
    ],
    currentPlayer: 1,
    tiles: [],
  } as unknown as GameState;
  // Only Tower is present, so we can use a partial Record
  const shares = { Tower: 2 } as Record<HOTEL_NAME, number>;
  const result = buySharesReducer(gameState, shares);
  assertExists(result.hotels);
  const playerShares = result.hotels &&
    result.hotels[0].shares.filter((s) => s.location === 1).length;
  assertEquals(playerShares, 2);
  assertExists(result.players);
  const playerMoney = result.players && result.players[0].money;
  assert(typeof playerMoney === 'number' && playerMoney < 1000);
});
