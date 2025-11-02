import { drawAndReplaceTilesReducer } from '../drawAndReplaceTilesReducer.ts';
import { assertThrows } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import type { Player, Tile } from '../../types/index.ts';
import { SAFE_HOTEL_SIZE } from '../../types/index.ts';

Deno.test('drawAndReplaceTilesReducer: throws if player has too many tiles', () => {
  // Minimal valid tiles and players
  const tiles = [
    { location: 1 },
    { location: 1 },
    { location: 1 },
    { location: 1 },
    { location: 1 },
    { location: 1 },
  ] as unknown as Tile[];
  const players = [{ id: 1 }] as unknown as Player[];
  assertThrows(() => drawAndReplaceTilesReducer(1, tiles, players));
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
