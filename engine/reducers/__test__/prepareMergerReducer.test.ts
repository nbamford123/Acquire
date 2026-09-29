import { prepareMergerReducer } from '../prepareMergerReducer.ts';
import { assertEquals, assertExists } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import type { BoardTile, Hotel, MergeResult, Player, Tile } from '../../types/index.ts';

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
  const [state, actions] = prepareMergerReducer(players, tiles, hotels, result, 1);
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

  const [state, actions] = prepareMergerReducer(players, tiles, hotels, result, 1);
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

  const [state, actions] = prepareMergerReducer(players, tiles, hotels, result, 1);
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

  const [state, actions] = prepareMergerReducer(players, tiles, hotels, result, 1);
  assertExists(state.players);
  const newPlayers = state.players as Player[];
  // Player 1 should be majority and have increased money, player 2 should have minority payout
  if (!(newPlayers[0].money > 10 && newPlayers[1].money > 20)) {
    throw new Error('Expected both majority and minority payouts to be applied');
  }
});

Deno.test('prepareMergerReducer: records merged size before tiles are absorbed', () => {
  const hotels = [
    { name: 'Tower', shares: [{ location: 1 }] },
    { name: 'Luxor', shares: [] },
  ] as unknown as Hotel[];
  const players = [{ id: 1, name: 'Alice', money: 0 }] as unknown as Player[];
  const tiles = [
    { row: 0, col: 0, location: 'board', hotel: 'Tower' },
    { row: 0, col: 1, location: 'board', hotel: 'Tower' },
    { row: 0, col: 2, location: 'board', hotel: 'Tower' },
    { row: 1, col: 0, location: 'board', hotel: 'Luxor' },
  ] as unknown as Tile[];
  const result = {
    needsMergeOrder: false,
    mergedHotel: 'Tower',
    survivingHotel: 'Luxor',
    remainingHotels: [],
    survivorTiles: tiles.map((tile) => ({ ...tile, hotel: 'Luxor' })),
  } as unknown as Extract<MergeResult, { needsMergeOrder: false }>;

  const [state] = prepareMergerReducer(players, tiles, hotels, result, 1);
  assertEquals(state.mergeContext?.mergedHotelSize, 3);
  assertEquals((state.tiles as BoardTile[]).filter((tile) => tile.hotel === 'Tower').length, 0);
});

Deno.test('prepareMergerReducer: every stockholder resolves in turn order from the merging player', () => {
  // Bob and Dan get bonuses, Eve holds a share but gets no bonus, Alice holds none
  const hotels = [
    {
      name: 'Tower',
      shares: [
        { location: 1 },
        { location: 1 },
        { location: 1 },
        { location: 3 },
        { location: 3 },
        { location: 2 },
        { location: 'bank' },
      ],
    },
  ] as unknown as Hotel[];
  const players = [
    { id: 0, name: 'Alice', money: 0 },
    { id: 1, name: 'Bob', money: 0 },
    { id: 2, name: 'Eve', money: 0 },
    { id: 3, name: 'Dan', money: 0 },
  ] as unknown as Player[];
  const result = {
    needsMergeOrder: false,
    mergedHotel: 'Tower',
    survivorTiles: [],
    survivingHotel: 'Luxor',
    remainingHotels: [],
  } as unknown as Extract<MergeResult, { needsMergeOrder: false }>;

  const [fromEve] = prepareMergerReducer(players, [], hotels, result, 2);
  assertEquals(fromEve.mergeContext?.stockholderIds, [2, 3, 1]);
  const [fromAlice] = prepareMergerReducer(players, [], hotels, result, 0);
  assertEquals(fromAlice.mergeContext?.stockholderIds, [1, 2, 3]);
});

Deno.test('prepareMergerReducer: logs bonus payouts by player name', () => {
  const hotels = [
    {
      name: 'Tower',
      shares: [{ location: 1 }, { location: 1 }, { location: 2 }],
    },
  ] as unknown as Hotel[];
  const players = [
    { id: 1, name: 'Alice', money: 0 },
    { id: 2, name: 'Bob', money: 0 },
  ] as unknown as Player[];
  const tiles = [
    { row: 0, col: 0, location: 'board', hotel: 'Tower' },
    { row: 0, col: 1, location: 'board', hotel: 'Tower' },
  ] as unknown as Tile[];
  const result = {
    needsMergeOrder: false,
    mergedHotel: 'Tower',
    survivorTiles: [],
    survivingHotel: 'Luxor',
    remainingHotels: [],
  } as unknown as Extract<MergeResult, { needsMergeOrder: false }>;

  const [, actions] = prepareMergerReducer(players, tiles, hotels, result, 1);
  // Tower at size 2 pays $2000 majority and $1000 minority
  assertEquals(actions.slice(-2), ['Alice was paid $2000', 'Bob was paid $1000']);
});
