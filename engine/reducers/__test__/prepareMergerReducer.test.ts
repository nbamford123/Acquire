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
      name: 'Sackson',
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
    survivingHotel: 'Sackson',
    remainingHotels: ['Sackson'],
  };
  // @ts-expect-error: partial mock for test
  const state = prepareMergerReducer(players, tiles, hotels, result);
  assertExists(state.players);
  assertEquals(state.players.length, 2);
  assertExists(state.tiles);
  assertExists(state.mergeContext);
});
