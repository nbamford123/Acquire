import { startGameReducer } from '../startGameReducers.ts';
import { assertEquals, assertExists } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import type { Player, Tile } from '../../types/index.ts';

Deno.test('startGameReducer: assigns tiles to players', () => {
  // Provide enough bag tiles for drawInitialTiles and player hands
  const tiles = [
    { row: 0, col: 0, location: 'bag' },
    { row: 0, col: 1, location: 'bag' },
    { row: 0, col: 2, location: 'bag' },
    { row: 0, col: 3, location: 'bag' },
    { row: 0, col: 4, location: 'bag' },
    { row: 0, col: 5, location: 'bag' },
    { row: 0, col: 6, location: 'bag' },
    { row: 0, col: 7, location: 'bag' },
    { row: 0, col: 8, location: 'bag' },
    { row: 0, col: 9, location: 'bag' },
    { row: 0, col: 10, location: 'bag' },
    { row: 0, col: 11, location: 'bag' },
  ] as unknown as Tile[];
  const players = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ] as unknown as Player[];
  const [result, actions] = startGameReducer(tiles, players);
  assertExists(result.players);
  assertEquals(result.players.length, 2);
  assertExists(result.tiles);
});
