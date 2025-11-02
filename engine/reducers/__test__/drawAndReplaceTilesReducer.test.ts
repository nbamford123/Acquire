import { drawAndReplaceTilesReducer } from '../drawAndReplaceTilesReducer.ts';
import { assertThrows } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import type { Player, Tile } from '../../types/index.ts';

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
