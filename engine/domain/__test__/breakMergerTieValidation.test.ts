import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { breakMergerTieValidation } from '../../domain/breakMergerTieValidation.ts';
import { type BoardTile, type GameState } from '../../types/index.ts';
import { GameError, GameErrorCodes } from '../../types/index.ts';

function boardTile(row: number, col: number, hotel?: any): BoardTile {
  const t: any = { row, col, location: 'board' };
  if (hotel) t.hotel = hotel;
  return t;
}

Deno.test('breakMergerTieValidation - basic cases', async (t) => {
  await t.step('throws when missing hotel names in action.payload', () => {
    const action: any = { payload: { resolvedTie: { survivor: undefined, merged: undefined } } };
    const state = {
      mergeContext: { originalHotels: ['Worldwide'] },
      tiles: [],
      hotels: [],
    } as unknown as GameState;
    const err = assertThrows(() => breakMergerTieValidation(action, state), GameError);
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws when mergeContext missing or invalid hotels in state', () => {
    const action: any = { payload: { resolvedTie: { survivor: 'Worldwide', merged: 'Sackson' } } };
    const state = { mergeContext: undefined, tiles: [], hotels: [] } as unknown as GameState;
    const err = assertThrows(() => breakMergerTieValidation(action, state), GameError);
    // getMergeContext throws GAME_INVALID_ACTION when missing
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws when hotels in mergeContext cannot be found on state', () => {
    const action: any = { payload: { resolvedTie: { survivor: 'Worldwide', merged: 'Sackson' } } };
    const state = {
      mergeContext: { originalHotels: ['Worldwide', 'Sackson'], survivingHotel: undefined },
      tiles: [],
      hotels: [{ name: 'Worldwide' }],
    } as unknown as GameState;
    const err = assertThrows(() => breakMergerTieValidation(action, state), GameError);
    assertEquals(err.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('accepts valid action when hotels and tiles exist', () => {
    const action: any = { payload: { resolvedTie: { survivor: 'Worldwide', merged: 'Sackson' } } };
    const state = {
      // include survivingHotel so validation can find the survivor in state.hotels
      mergeContext: {
        originalHotels: ['Worldwide', 'Sackson'],
        survivingHotel: 'Worldwide',
        additionalTiles: [],
      },
      tiles: [boardTile(0, 0, 'Worldwide'), boardTile(0, 1, 'Sackson')],
      hotels: [{ name: 'Worldwide' }, { name: 'Sackson' }],
    } as unknown as GameState;
    // Should not throw
    breakMergerTieValidation(action, state);
  });
});
