import { foundHotelReducer } from '../foundHotelReducer.ts';
import {
  assert,
  assertEquals,
  assertExists,
  assertThrows,
} from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { GameErrorCodes } from '../../types/index.ts';
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

Deno.test('foundHotelReducer: when no bank shares remain, no additional share is awarded', () => {
  // Hotel has no bank shares available
  const hotels = [
    {
      name: 'Tower',
      shares: [
        { location: 2 },
        { location: 3 },
      ],
    },
  ] as unknown as Hotel[];
  const context = { tiles: [{ row: 0, col: 0 }] } as unknown as FoundHotelContext;
  const tiles = [
    { row: 0, col: 0, location: 'board' },
  ] as unknown as Tile[];

  const beforeCount = hotels[0].shares.filter((s) => s.location === 1).length;
  const result = foundHotelReducer(1, hotels, 'Tower' as HOTEL_NAME, context, tiles);
  assertExists(result.hotels);
  const afterCount = result.hotels &&
    result.hotels[0].shares.filter((s: any) => s.location === 1).length;
  // No new share should have been awarded to player 1
  assertEquals(afterCount, beforeCount);
});

Deno.test('foundHotelReducer: throws when context tile is not on board', () => {
  const hotels = [
    {
      name: 'Tower',
      shares: [
        { location: 'bank' },
      ],
    },
  ] as unknown as Hotel[];
  // context references a tile not present on board
  const context = { tiles: [{ row: 9, col: 9 }] } as unknown as FoundHotelContext;
  const tiles = [
    { row: 0, col: 0, location: 'board' },
  ] as unknown as Tile[];

  assertThrows(() => foundHotelReducer(1, hotels, 'Tower' as HOTEL_NAME, context, tiles), Error);
});

Deno.test('foundHotelReducer: throws when hotel name is not found', () => {
  const hotels = [
    {
      name: 'Luxor',
      shares: [
        { location: 'bank' },
      ],
    },
  ] as unknown as Hotel[];

  const context = { tiles: [{ row: 0, col: 0 }] } as unknown as FoundHotelContext;
  const tiles = [
    { row: 0, col: 0, location: 'board' },
  ] as unknown as Tile[];

  const err = assertThrows(() =>
    foundHotelReducer(1, hotels, 'Tower' as HOTEL_NAME, context, tiles)
  );
  // getHotelByName throws GAME_PROCESSING_ERROR when hotel cannot be found
  // The thrown error should include the processing error code
  // Some error implementations attach a 'code' property
  // Check message as a conservative assertion
  if (!/Hotel not found/.test((err as { message: string }).message)) {
    throw new Error('Expected Hotel not found error');
  }
});

Deno.test('foundHotelReducer: awards a bank share at non-zero index', () => {
  const hotels = [
    {
      name: 'Tower',
      shares: [
        { location: 2 },
        { location: 'bank' },
        { location: 'bank' },
      ],
    },
  ] as unknown as Hotel[];
  const context = { tiles: [{ row: 0, col: 0 }] } as unknown as FoundHotelContext;
  const tiles = [
    { row: 0, col: 0, location: 'board' },
  ] as unknown as Tile[];

  const result = foundHotelReducer(7, hotels, 'Tower' as HOTEL_NAME, context, tiles);
  assertExists(result.hotels);
  // The first bank share is at index 1, so player 7 should own that one
  const assignedIndex = result.hotels &&
    result.hotels[0].shares.findIndex((s: any) => s.location === 7);
  assertEquals(assignedIndex, 1);
});

Deno.test('foundHotelReducer: does not modify other hotels', () => {
  const hotels = [
    {
      name: 'Tower',
      shares: [
        { location: 'bank' },
      ],
    },
    {
      name: 'Luxor',
      shares: [
        { location: 2 },
      ],
    },
  ] as unknown as Hotel[];
  const context = { tiles: [{ row: 0, col: 0 }] } as unknown as FoundHotelContext;
  const tiles = [
    { row: 0, col: 0, location: 'board' },
  ] as unknown as Tile[];

  const result = foundHotelReducer(3, hotels, 'Tower' as HOTEL_NAME, context, tiles);
  assertExists(result.hotels);
  // Ensure Luxor hotel's shares are unchanged
  const Luxor = result.hotels && result.hotels.find((h: any) => h.name === 'Luxor');
  const unchanged = Luxor && Luxor.shares.some((s: any) => s.location === 2);
  assert(unchanged);
});
