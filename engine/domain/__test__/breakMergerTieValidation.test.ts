import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { breakMergerTieValidation } from '../../domain/breakMergerTieValidation.ts';
import { type BoardTile, type GameState } from '../../types/index.ts';
import { GameError, GameErrorCodes } from '../../types/index.ts';

function boardTile(row: number, col: number, hotel?: any): BoardTile {
  const t: any = { row, col, location: 'board' };
  if (hotel) t.hotel = hotel;
  return t;
}

const tieAction = (survivor: any, merged: any): any => ({
  payload: { player: 'P0', resolvedTie: { survivor, merged } },
});

// Worldwide and Luxor tied for largest, Festival smaller
const initialTieState = (overrides: Partial<GameState> = {}) =>
  ({
    mergeContext: {
      originalHotels: ['Worldwide', 'Luxor', 'Festival'],
      additionalTiles: [],
    },
    mergerTieContext: { tiedHotels: ['Worldwide', 'Luxor'] },
    tiles: [boardTile(0, 0, 'Worldwide'), boardTile(0, 1, 'Luxor'), boardTile(0, 2, 'Festival')],
    hotels: [{ name: 'Worldwide' }, { name: 'Luxor' }, { name: 'Festival' }],
    ...overrides,
  }) as unknown as GameState;

// Worldwide already survives, Luxor and Festival tied to merge next
const survivorPickedState = () =>
  ({
    mergeContext: {
      originalHotels: ['Luxor', 'Festival'],
      survivingHotel: 'Worldwide',
      additionalTiles: [],
    },
    mergerTieContext: { tiedHotels: ['Luxor', 'Festival'] },
    tiles: [boardTile(0, 0, 'Worldwide'), boardTile(0, 1, 'Luxor'), boardTile(0, 2, 'Festival')],
    hotels: [{ name: 'Worldwide' }, { name: 'Luxor' }, { name: 'Festival' }],
  }) as unknown as GameState;

Deno.test('breakMergerTieValidation - basic cases', async (t) => {
  await t.step('throws when missing hotel names in action.payload', () => {
    const err = assertThrows(
      () => breakMergerTieValidation(tieAction(undefined, undefined), initialTieState()),
      GameError,
    );
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws when survivor and merged are the same hotel', () => {
    const err = assertThrows(
      () => breakMergerTieValidation(tieAction('Worldwide', 'Worldwide'), initialTieState()),
      GameError,
      'must be different',
    );
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws when mergeContext missing', () => {
    const state = initialTieState({ mergeContext: undefined });
    const err = assertThrows(
      () => breakMergerTieValidation(tieAction('Worldwide', 'Luxor'), state),
      GameError,
    );
    // getMergeContext throws GAME_INVALID_ACTION when missing
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws when mergerTieContext missing', () => {
    const state = initialTieState({ mergerTieContext: undefined });
    const err = assertThrows(
      () => breakMergerTieValidation(tieAction('Worldwide', 'Luxor'), state),
      GameError,
      'Missing merger tie context',
    );
    assertEquals(err.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('throws when hotels cannot be found on state', () => {
    const state = initialTieState({ hotels: [{ name: 'Worldwide' }] as any });
    const err = assertThrows(
      () => breakMergerTieValidation(tieAction('Worldwide', 'Luxor'), state),
      GameError,
    );
    assertEquals(err.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });
});

Deno.test('breakMergerTieValidation - initial tie (no survivor yet)', async (t) => {
  await t.step('accepts either tied hotel as survivor', () => {
    breakMergerTieValidation(tieAction('Worldwide', 'Luxor'), initialTieState());
    breakMergerTieValidation(tieAction('Luxor', 'Worldwide'), initialTieState());
  });

  await t.step('throws when survivor is not one of the tied hotels', () => {
    const err = assertThrows(
      () => breakMergerTieValidation(tieAction('Festival', 'Luxor'), initialTieState()),
      GameError,
      'Surviving hotel must be one of Worldwide, Luxor',
    );
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws when merged hotel is not part of the merger', () => {
    const err = assertThrows(
      () => breakMergerTieValidation(tieAction('Worldwide', 'Imperial'), initialTieState()),
      GameError,
      'Imperial is not part of this merger',
    );
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });
});

Deno.test('breakMergerTieValidation - survivor already picked', async (t) => {
  await t.step('accepts either tied hotel as merged', () => {
    breakMergerTieValidation(tieAction('Worldwide', 'Luxor'), survivorPickedState());
    breakMergerTieValidation(tieAction('Worldwide', 'Festival'), survivorPickedState());
  });

  await t.step('throws when survivor differs from the chosen survivor', () => {
    const err = assertThrows(
      () => breakMergerTieValidation(tieAction('Luxor', 'Festival'), survivorPickedState()),
      GameError,
      'Worldwide is already the surviving hotel',
    );
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws when merged is not one of the tied hotels', () => {
    const state = survivorPickedState();
    state.mergerTieContext = { tiedHotels: ['Luxor', 'Festival'] };
    state.mergeContext!.originalHotels = ['Luxor', 'Festival', 'Imperial'];
    const err = assertThrows(
      () => breakMergerTieValidation(tieAction('Worldwide', 'Imperial'), state),
      GameError,
      'Merged hotel must be one of Luxor, Festival',
    );
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });
});
