import { assertThrows } from 'jsr:@std/assert';
import { breakMergerTieValidation } from '../../domain/breakMergerTieValidation.ts';
import { GameError, type GameState } from '../../types/index.ts';

Deno.test('breakMergerTieValidation - extra branches', async (t) => {
  await t.step('throws when survivingHotel set but not present in state.hotels', () => {
    const action: any = { payload: { resolvedTie: { survivor: 'Worldwide', merged: 'Luxor' } } };
    const state = {
      mergeContext: { originalHotels: ['Worldwide', 'Luxor'], survivingHotel: 'Worldwide' },
      tiles: [],
      hotels: [{ name: 'Luxor' }], // missing surviving hotel
    } as unknown as GameState;
    const err = assertThrows(() => breakMergerTieValidation(action, state), GameError);
    // should be a processing error
    (err as any).code;
  });

  await t.step('accepts when additionalTiles map to board tiles', () => {
    const action: any = { payload: { resolvedTie: { survivor: 'Worldwide', merged: 'Luxor' } } };
    const state = {
      mergeContext: {
        originalHotels: ['Worldwide', 'Luxor'],
        survivingHotel: 'Worldwide',
        additionalTiles: [{ row: 0, col: 0 }],
      },
      tiles: [{ row: 0, col: 0, location: 'board', hotel: 'Worldwide' }],
      hotels: [{ name: 'Worldwide' }, { name: 'Luxor' }],
    } as unknown as GameState;
    // should not throw
    breakMergerTieValidation(action, state);
  });

  await t.step('throws when additionalTiles refer to missing board tile', () => {
    const action: any = { payload: { resolvedTie: { survivor: 'Worldwide', merged: 'Luxor' } } };
    const state = {
      mergeContext: {
        originalHotels: ['Worldwide', 'Luxor'],
        survivingHotel: 'Worldwide',
        additionalTiles: [{ row: 9, col: 9 }],
      },
      tiles: [{ row: 0, col: 0, location: 'board', hotel: 'Worldwide' }],
      hotels: [{ name: 'Worldwide' }, { name: 'Luxor' }],
    } as unknown as GameState;
    const err = assertThrows(() => breakMergerTieValidation(action, state), GameError);
    (err as any).message;
  });

  await t.step(
    'throws when survivingHotel is undefined but originalHotels exist and hotels include them',
    () => {
      const action: any = {
        payload: { resolvedTie: { survivor: 'Worldwide', merged: 'Luxor' } },
      };
      const state = {
        mergeContext: { originalHotels: ['Worldwide', 'Luxor'], survivingHotel: undefined },
        tiles: [{ row: 0, col: 0, location: 'board', hotel: 'Worldwide' }, {
          row: 0,
          col: 1,
          location: 'board',
          hotel: 'Luxor',
        }],
        hotels: [{ name: 'Worldwide' }, { name: 'Luxor' }],
      } as unknown as GameState;
      // survivor not set in mergeContext -> should throw processing error because survivor can't be found
      assertThrows(() => breakMergerTieValidation(action, state), GameError);
    },
  );

  await t.step('throws when originalHotels is empty but survivingHotel present', () => {
    const action: any = { payload: { resolvedTie: { survivor: 'Worldwide', merged: 'Luxor' } } };
    const state = {
      mergeContext: { originalHotels: [], survivingHotel: 'Worldwide' },
      tiles: [{ row: 0, col: 0, location: 'board', hotel: 'Worldwide' }],
      hotels: [{ name: 'Worldwide' }, { name: 'Luxor' }],
    } as unknown as GameState;
    // originalHotels empty -> getHotelsByNames returns [], causing validation to fail
    assertThrows(() => breakMergerTieValidation(action, state), GameError);
  });
});
