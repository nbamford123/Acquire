import { assertEquals, assertThrows } from 'jsr:@std/assert';
import {
  getBoardTile,
  getFoundHotelContext,
  getHotelByName,
  getMergeContext,
} from '../../domain/assertions.ts';
import { GameError, GameErrorCodes } from '../../types/index.ts';

Deno.test('assertions helper functions', async (t) => {
  await t.step('getFoundHotelContext throws when missing', () => {
    const state = {} as any;
    const err = assertThrows(
      () => getFoundHotelContext(state),
      GameError,
      'Missing foundHotel context',
    );
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('getMergeContext throws when missing', () => {
    const state = {} as any;
    const err = assertThrows(() => getMergeContext(state), GameError, 'Missing merge context');
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('getHotelByName throws when hotel not found', () => {
    const hotels = [{ name: 'Worldwide' }] as any;
    const err = assertThrows(
      () => getHotelByName(hotels, 'Sackson'),
      GameError,
      'Hotel not found: Sackson',
    );
    assertEquals(err.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('getBoardTile throws when tile not found', () => {
    const board: any[] = [];
    const err = assertThrows(() => getBoardTile(board, 0, 0), GameError, 'Tile not found: 1A');
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });
});
