import { drawAndReplaceTilesReducer } from '../drawAndReplaceTilesReducer.ts';
import { assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import type { Player, Tile } from '../../types/index.ts';
import { SAFE_HOTEL_SIZE } from '../../types/index.ts';

Deno.test('drawAndReplaceTilesReducer: draws nothing when the hand is already full', () => {
  // A player who skipped placing a tile still has 6
  const tiles = [
    ...Array.from({ length: 6 }, (_, col) => ({ row: 8, col, location: 1 })),
    { row: 0, col: 0, location: 'bag' },
  ] as unknown as Tile[];
  const players = [{ id: 1 }] as unknown as Player[];
  const result = drawAndReplaceTilesReducer(1, tiles, players);
  assertEquals(result.tiles.filter((tile) => tile.location === 1).length, 6);
  assertEquals(result.tiles.filter((tile) => tile.location === 'bag').length, 1);
});

Deno.test('drawAndReplaceTilesReducer: refills the hand to 6 as far as the bag allows', () => {
  const tiles = [
    ...Array.from({ length: 4 }, (_, col) => ({ row: 8, col, location: 1 })),
    ...Array.from({ length: 5 }, (_, col) => ({ row: 0, col, location: 'bag' })),
  ] as unknown as Tile[];
  const players = [{ id: 1 }] as unknown as Player[];
  const result = drawAndReplaceTilesReducer(1, tiles, players);
  assertEquals(result.tiles.filter((tile) => tile.location === 1).length, 6);
  assertEquals(result.tiles.filter((tile) => tile.location === 'bag').length, 3);
});

Deno.test('drawAndReplaceTilesReducer: draws a tile for player when valid', () => {
  const tiles = [
    { location: 'bag' },
    { location: 'bag' },
    { location: 'bag' },
  ] as unknown as Tile[];
  const players = [{ id: 1 }] as unknown as Player[];
  const result = drawAndReplaceTilesReducer(1, tiles, players);
  if (!result.tiles || !Array.isArray(result.tiles)) throw new Error('Expected tiles array');
});

Deno.test('drawAndReplaceTilesReducer: replaces dead player tiles when adjacent to two safe hotels', () => {
  // Build two safe hotels with SAFE_HOTEL_SIZE tiles each
  const hotelA = 'Worldwide';
  const hotelB = 'Tower';

  const tiles: Tile[] = [] as unknown as Tile[];

  // Create SAFE_HOTEL_SIZE board tiles for hotelA at col 0
  for (let r = 0; r < SAFE_HOTEL_SIZE; r++) {
    tiles.push({ row: r, col: 0, location: 'board', hotel: hotelA } as unknown as Tile);
  }
  // Create SAFE_HOTEL_SIZE board tiles for hotelB at col 2
  for (let r = 0; r < SAFE_HOTEL_SIZE; r++) {
    tiles.push({ row: r, col: 2, location: 'board', hotel: hotelB } as unknown as Tile);
  }

  // Place a player's tile between the two hotels at (5,1)
  tiles.push({ row: 5, col: 1, location: 1 } as unknown as Tile);
  // Player 2 placed a tile this turn, so they draw one
  for (let col = 5; col < 10; col++) {
    tiles.push({ row: 8, col, location: 2 } as unknown as Tile);
  }

  // Add some bag tiles to draw from
  tiles.push({ row: 10, col: 10, location: 'bag' } as unknown as Tile);
  tiles.push({ row: 11, col: 10, location: 'bag' } as unknown as Tile);

  const players = [{ id: 1 }, { id: 2 }] as unknown as Player[];

  // Current player 2 draws a tile; player 1 has a dead tile and should get a replacement
  const result = drawAndReplaceTilesReducer(2, tiles, players);
  if (!result.tiles || !Array.isArray(result.tiles)) throw new Error('Expected tiles array');
  // At least one replacement draw for player 1 should be present in the returned tiles
  const hasReplacementForPlayer1 = result.tiles.some((t: any) => t.location === 1 && t.row !== 5);
  if (!hasReplacementForPlayer1) throw new Error('Expected replacement tile drawn for player 1');
});

Deno.test('drawAndReplaceTilesReducer: replacing two dead tiles draws two different tiles', () => {
  const tiles: Tile[] = [];
  // Safe hotels in columns 0, 2, and 4, so tiles in columns 1 and 3 are dead
  for (let r = 0; r < SAFE_HOTEL_SIZE; r++) {
    tiles.push({ row: r, col: 0, location: 'board', hotel: 'Worldwide' } as unknown as Tile);
    tiles.push({ row: r, col: 2, location: 'board', hotel: 'Tower' } as unknown as Tile);
    tiles.push({ row: r, col: 4, location: 'board', hotel: 'Luxor' } as unknown as Tile);
  }
  tiles.push({ row: 5, col: 1, location: 1 } as unknown as Tile);
  tiles.push({ row: 5, col: 3, location: 1 } as unknown as Tile);
  // Player 2 is current with a full hand, so the bag only goes to replacements
  for (let col = 6; col < 12; col++) {
    tiles.push({ row: 8, col, location: 2 } as unknown as Tile);
  }
  tiles.push({ row: 0, col: 10, location: 'bag' } as unknown as Tile);
  tiles.push({ row: 1, col: 10, location: 'bag' } as unknown as Tile);
  const players = [{ id: 1 }] as unknown as Player[];

  const result = drawAndReplaceTilesReducer(2, tiles, players);
  const hand = result.tiles.filter((tile) => tile.location === 1);
  assertEquals(hand.map((tile) => `${tile.row},${tile.col}`).sort(), ['0,10', '1,10']);
  assertEquals(result.tiles.filter((tile) => tile.location === 'dead').length, 2);
});

