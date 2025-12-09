import { prepareMergerReducer } from '../prepareMergerReducer.ts';
import { assertEquals, assertExists } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import type { Hotel, MergeResult, Player, Tile } from '../../types/index.ts';

Deno.test('prepareMergerReducer: updates players and tiles after merger', () => {
  // Provide hotels with shares for both players
  const hotels = [
    {
      name: 'Tower',
      shares: [
        { location: 1 },
        { location: 2 },
        { location: 'bank' },
      ],
    },
    {
      name: 'Luxor',
      shares: [
        { location: 1 },
        { location: 'bank' },
      ],
    },
  ] as unknown as Hotel[];
  const players = [
    { id: 1, name: 'Alice', money: 100 },
    { id: 2, name: 'Bob', money: 200 },
  ] as unknown as Player[];
  const tiles = [] as unknown as Tile[];
  const result = {
    needsMergeOrder: false,
    mergedHotel: 'Tower',
    survivorTiles: [],
    survivingHotel: 'Luxor',
    remainingHotels: ['Luxor'],
  };
  // @ts-expect-error: partial mock for test
  const state = prepareMergerReducer(players, tiles, hotels, result);
  assertExists(state.players);
  assertEquals(state.players.length, 2);
  assertExists(state.tiles);
  assertExists(state.mergeContext);
});

Deno.test('prepareMergerReducer: splits payout equally when all tied', () => {
  const hotels = [
    {
      name: 'Tower',
      shares: [
        { location: 1 },
        { location: 2 },
      ],
    },
  ] as unknown as Hotel[];
  const players = [
    { id: 1, name: 'Alice', money: 100 },
    { id: 2, name: 'Bob', money: 200 },
  ] as unknown as Player[];
  const tiles = [] as unknown as Tile[];
  const result = {
    needsMergeOrder: false,
    mergedHotel: 'Tower',
    survivorTiles: [],
    survivingHotel: 'Luxor',
    remainingHotels: ['Luxor'],
  } as unknown as Extract<MergeResult, { needsMergeOrder: false }>;

  const state = prepareMergerReducer(players, tiles, hotels, result);
  assertExists(state.players);
  // Both players should have received some payout (equal split case)
  const newPlayers = state.players as Player[];
  if (newPlayers[0].money === 100 || newPlayers[1].money === 200) {
    throw new Error('Expected payouts to be applied to both players');
  }
});

Deno.test('prepareMergerReducer: tie for majority pays only tied players', () => {
  const hotels = [
    {
      name: 'Tower',
      shares: [
        { location: 1 },
        { location: 1 },
        { location: 2 },
        { location: 2 },
        { location: 3 },
      ],
    },
  ] as unknown as Hotel[];
  const players = [
    { id: 1, name: 'Alice', money: 0 },
    { id: 2, name: 'Bob', money: 0 },
    { id: 3, name: 'Eve', money: 0 },
  ] as unknown as Player[];
  const tiles = [] as unknown as Tile[];
  const result = {
    needsMergeOrder: false,
    mergedHotel: 'Tower',
    survivorTiles: [],
    survivingHotel: 'Luxor',
    remainingHotels: ['Luxor'],
  } as unknown as Extract<MergeResult, { needsMergeOrder: false }>;

  const state = prepareMergerReducer(players, tiles, hotels, result);
  assertExists(state.players);
  const newPlayers = state.players as Player[];
  // Player 1 and 2 tied for majority so they should have >0 money, player 3 should be unchanged
  if (!(newPlayers[0].money > 0 && newPlayers[1].money > 0 && newPlayers[2].money === 0)) {
    throw new Error('Expected only tied majority players to be paid');
  }
});

Deno.test('prepareMergerReducer: single majority and single minority payout', () => {
  const hotels = [
    {
      name: 'Tower',
      shares: [
        { location: 1 },
        { location: 1 },
        { location: 1 },
        { location: 2 },
        { location: 2 },
      ],
    },
  ] as unknown as Hotel[];
  const players = [
    { id: 1, name: 'Alice', money: 10 },
    { id: 2, name: 'Bob', money: 20 },
  ] as unknown as Player[];
  const tiles = [] as unknown as Tile[];
  const result = {
    needsMergeOrder: false,
    mergedHotel: 'Tower',
    survivorTiles: [],
    survivingHotel: 'Luxor',
    remainingHotels: ['Luxor'],
  } as unknown as Extract<MergeResult, { needsMergeOrder: false }>;

  const state = prepareMergerReducer(players, tiles, hotels, result);
  assertExists(state.players);
  const newPlayers = state.players as Player[];
  // Player 1 should be majority and have increased money, player 2 should have minority payout
  if (!(newPlayers[0].money > 10 && newPlayers[1].money > 20)) {
    throw new Error('Expected both majority and minority payouts to be applied');
  }
});
