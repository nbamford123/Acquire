import { buySharesReducer } from '../buySharesReducer.ts';
import { assert, assertEquals, assertExists } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import type { GameState, HOTEL_NAME } from '../../types/index.ts';
import { sharePrice } from '../../domain/index.ts';

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

Deno.test('buySharesReducer: zero shares requested leaves state unchanged', () => {
  const gameState = {
    hotels: [
      {
        name: 'Tower',
        shares: [
          { location: 'bank' },
          { location: 'bank' },
        ],
      },
    ],
    players: [
      { id: 1, money: 1000 },
    ],
    currentPlayer: 1,
    tiles: [{ hotel: 'Tower' }],
  } as unknown as GameState;
  const shares = { Tower: 0 } as Record<HOTEL_NAME, number>;
  const result = buySharesReducer(gameState, shares);
  assertExists(result.hotels);
  const playerAssigned = result.hotels && result.hotels[0].shares.some((s) => s.location === 1);
  assertEquals(playerAssigned, false);
  assertExists(result.players);
  const playerMoney = result.players && result.players[0].money;
  assertEquals(playerMoney, 1000);
});

Deno.test('buySharesReducer: requesting more shares than bank provides charges only for available shares', () => {
  const gameState = {
    hotels: [
      {
        name: 'Tower',
        shares: [
          { location: 'bank' }, // only 1 available
          { location: 2 },
        ],
      },
    ],
    players: [{ id: 1, money: 1000 }],
    currentPlayer: 1,
    tiles: [{ hotel: 'Tower' }],
  } as unknown as GameState;

  const shares = { Tower: 3 } as Record<HOTEL_NAME, number>;
  const beforeMoney = gameState.players[0].money as number;
  const result = buySharesReducer(gameState, shares);
  assertExists(result.hotels);
  const playerAssignedCount = result.hotels &&
    result.hotels[0].shares.filter((s) => s.location === 1).length;
  // Only the single bank share should have been assigned
  assertEquals(playerAssignedCount, 1);

  assertExists(result.players);
  const afterMoney = result.players && result.players[0].money as number;
  const bankCount = gameState.hotels[0].shares.filter((s) => s.location === 'bank').length;
  const price = sharePrice('Tower' as HOTEL_NAME, gameState.tiles as any);
  const expected = beforeMoney - bankCount * price;
  assertEquals(afterMoney, expected);
});
