import { growHotelReducer } from '../growHotelReducer.ts';
import { assert } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import type { BoardTile, GameState, HOTEL_NAME } from '../../types/index.ts';

Deno.test('growHotelReducer: updates tiles with hotel name', () => {
  const gameState = {
    tiles: [
      { row: 0, col: 0, location: 'bag' },
      { row: 1, col: 1, location: 'bag' },
    ],
  } as unknown as GameState;
  const playedTile = { row: 0, col: 0, location: 'bag' } as unknown as BoardTile;
  const additionalTiles = [{ row: 1, col: 1, location: 'bag' } as unknown as BoardTile];
  const result = growHotelReducer(gameState, 'Tower' as HOTEL_NAME, playedTile, additionalTiles);
  assert(Array.isArray(result.tiles));
  const hasHotel = result.tiles &&
    result.tiles.some((t) => 'hotel' in t && (t as { hotel?: string }).hotel === 'Tower');
  assert(hasHotel);
});
