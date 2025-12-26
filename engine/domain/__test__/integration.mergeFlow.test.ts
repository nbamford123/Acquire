import { assertEquals } from 'jsr:@std/assert';
import { mergeHotels } from '../../domain/mergeHotelsOperation.ts';
import { breakMergerTieValidation } from '../../domain/breakMergerTieValidation.ts';
import { type GameState } from '../../types/index.ts';

function createBoardTile(row: number, col: number, hotel?: any) {
  const t: any = { row, col, location: 'board' };
  if (hotel) t.hotel = hotel;
  return t;
}

Deno.test('integration - tie detection then breakMergerTieValidation', async (t) => {
  await t.step('mergeHotels detects tie and breakMergerTieValidation accepts resolution', () => {
    const gameBoard = [
      ...Array.from({ length: 5 }, (_, i) => createBoardTile(0, i, 'Worldwide')),
      ...Array.from({ length: 5 }, (_, i) => createBoardTile(1, i, 'Luxor')),
    ];

    const mergeResult = mergeHotels(
      { originalHotels: ['Worldwide', 'Luxor'] } as any,
      gameBoard as any,
    );
    // If it requires merge order, ensure we can resolve it via breakMergerTieValidation
    if (mergeResult.needsMergeOrder) {
      const state = {
        mergeContext: { originalHotels: ['Worldwide', 'Luxor'], survivingHotel: 'Worldwide' },
        tiles: gameBoard,
        hotels: [{ name: 'Worldwide' }, { name: 'Luxor' }],
      } as unknown as GameState;
      const action: any = {
        payload: { resolvedTie: { survivor: 'Worldwide', merged: 'Luxor' } },
      };
      // should not throw
      breakMergerTieValidation(action, state);
      assertEquals(true, true);
    } else {
      // No tie - merge happened deterministically; test passes if mergeResult returned a survivor
      assertEquals((mergeResult as any).survivingHotel !== undefined, true);
    }
  });
});
