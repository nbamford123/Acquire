import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { resolveMergerValidation } from '../../domain/resolveMergerValidation.ts';
import { GamePhase, type GameState } from '../../types/index.ts';
import { GameError, GameErrorCodes } from '../../types/index.ts';

function makeHotel(name: string, ownerCounts: Record<number, number> = {}): any {
  // build shares array with locations set according to ownerCounts
  const shares: any[] = Array.from({ length: 25 }, (_, i) => ({ location: 'bank' }));
  for (const [playerIdStr, count] of Object.entries(ownerCounts)) {
    const playerId = Number(playerIdStr);
    let assigned = 0;
    for (let i = 0; i < shares.length && assigned < count; i++) {
      if (shares[i].location === 'bank') {
        shares[i].location = playerId;
        assigned++;
      }
    }
  }
  return { name, shares };
}

Deno.test('resolveMergerValidation - core checks', async (t) => {
  await t.step('throws when merge context missing', () => {
    const state = { mergeContext: undefined } as unknown as GameState;
    const err = assertThrows(
      () => resolveMergerValidation(state, 1, { sell: 0, trade: 0 }),
      GameError,
    );
    // getMergeContext throws GAME_INVALID_ACTION when missing
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws when playerId is not first stockholder', () => {
    const state = {
      mergeContext: { survivingHotel: 'Worldwide', mergedHotel: 'Sackson', stockholderIds: [2] },
      hotels: [makeHotel('Worldwide'), makeHotel('Sackson')],
    } as any as GameState;
    const err = assertThrows(
      () => resolveMergerValidation(state, 1, { sell: 0, trade: 0 }),
      GameError,
    );
    assertEquals(err.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('throws when hotel names invalid', () => {
    const state = {
      mergeContext: { survivingHotel: 'Bad', mergedHotel: 'AlsoBad', stockholderIds: [1] },
      hotels: [makeHotel('Worldwide')],
    } as any as GameState;
    const err = assertThrows(
      () => resolveMergerValidation(state, 1, { sell: 0, trade: 0 }),
      GameError,
    );
    assertEquals(err.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('throws when player does not have enough merged shares', () => {
    const state = {
      mergeContext: { survivingHotel: 'Worldwide', mergedHotel: 'Sackson', stockholderIds: [1] },
      hotels: [makeHotel('Worldwide'), makeHotel('Sackson')],
    } as any as GameState;
    const err = assertThrows(
      () => resolveMergerValidation(state, 1, { sell: 1, trade: 1 }),
      GameError,
    );
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws when trying to trade odd number', () => {
    // player owns 2 shares in merged hotel
    const state = {
      mergeContext: { survivingHotel: 'Worldwide', mergedHotel: 'Sackson', stockholderIds: [1] },
      hotels: [makeHotel('Worldwide'), makeHotel('Sackson', { 1: 2 })],
    } as any as GameState;
    const err = assertThrows(
      () => resolveMergerValidation(state, 1, { sell: 0, trade: 1 }),
      GameError,
    );
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws when not enough remaining shares in survivor to trade', () => {
    // survivor has 0 remaining (all owned), merged player has 2 to trade -> tradedShares=1 but survivor has 0
    const survivor = makeHotel('Worldwide');
    survivor.shares = survivor.shares.map(() => ({ location: 1 })); // all owned
    const merged = makeHotel('Sackson', { 1: 2 });
    const state = {
      mergeContext: { survivingHotel: 'Worldwide', mergedHotel: 'Sackson', stockholderIds: [1] },
      hotels: [survivor, merged],
    } as any as GameState;
    const err = assertThrows(
      () => resolveMergerValidation(state, 1, { sell: 0, trade: 2 }),
      GameError,
    );
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('returns data when valid', () => {
    const survivor = makeHotel('Worldwide');
    const merged = makeHotel('Sackson', { 1: 3 });
    const state = {
      mergeContext: { survivingHotel: 'Worldwide', mergedHotel: 'Sackson', stockholderIds: [1] },
      hotels: [survivor, merged],
    } as any as GameState;
    const result = resolveMergerValidation(state, 1, { sell: 1, trade: 2 });
    assertEquals(result.survivor.name, 'Worldwide');
    assertEquals(result.merged.name, 'Sackson');
    assertEquals(Array.isArray(result.stockholderIds), true);
  });
});
