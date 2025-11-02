import { foundHotelReducer } from '../foundHotelReducer.ts';
import { assert, assertExists } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import type { FoundHotelContext, Hotel, HOTEL_NAME, Tile } from '../../types/index.ts';

Deno.test('foundHotelReducer: assigns a share to the player and updates tiles', () => {
  const hotels = [
    {
      name: 'Tower',
      shares: [
        { location: 'bank' },
        { location: 'bank' },
      ],
    },
  ] as unknown as Hotel[];
  const context = { tiles: [{ row: 0, col: 0 }] } as unknown as FoundHotelContext;
  // Provide a board tile at the expected location for getBoardTile
  const tiles = [
    { row: 0, col: 0, location: 'board' },
    { row: 0, col: 0, location: 'bag' },
  ] as unknown as Tile[];
  const result = foundHotelReducer(1, hotels, 'Tower' as HOTEL_NAME, context, tiles);
  assertExists(result.hotels);
  const playerShare = result.hotels && result.hotels[0].shares.some((s) => s.location === 1);
  assert(playerShare);
  assertExists(result.tiles);
  assert(Array.isArray(result.tiles) && result.tiles.length > 0);
});
