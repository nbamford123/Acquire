import { assertThrows } from 'jsr:@std/assert';
import { breakMergerTieValidation } from '../../domain/breakMergerTieValidation.ts';
import { GameError, type GameState } from '../../types/index.ts';

const action: any = { payload: { resolvedTie: { survivor: 'Worldwide', merged: 'Luxor' } } };

const stateWithAdditionalTiles = (additionalTiles: { row: number; col: number }[]) =>
  ({
    mergeContext: {
      originalHotels: ['Worldwide', 'Luxor'],
      additionalTiles,
    },
    mergerTieContext: { tiedHotels: ['Worldwide', 'Luxor'] },
    tiles: [
      { row: 0, col: 0, location: 'board', hotel: 'Worldwide' },
      { row: 0, col: 1, location: 'board', hotel: 'Luxor' },
      { row: 0, col: 2, location: 'board' },
    ],
    hotels: [{ name: 'Worldwide' }, { name: 'Luxor' }],
  }) as unknown as GameState;

Deno.test('breakMergerTieValidation - extra branches', async (t) => {
  await t.step('throws when surviving hotel not present in state.hotels', () => {
    const state = stateWithAdditionalTiles([]);
    state.hotels = [{ name: 'Luxor' }] as any;
    assertThrows(() => breakMergerTieValidation(action, state), GameError, 'Hotel not found');
  });

  await t.step('accepts when additionalTiles map to board tiles', () => {
    // should not throw
    breakMergerTieValidation(action, stateWithAdditionalTiles([{ row: 0, col: 2 }]));
  });

  await t.step('throws when additionalTiles refer to missing board tile', () => {
    assertThrows(
      () => breakMergerTieValidation(action, stateWithAdditionalTiles([{ row: 8, col: 8 }])),
      GameError,
      'Tile not found',
    );
  });

  await t.step('throws when tiedHotels is empty', () => {
    const state = stateWithAdditionalTiles([]);
    state.mergerTieContext = { tiedHotels: [] };
    assertThrows(() => breakMergerTieValidation(action, state), GameError, 'tie context');
  });
});
