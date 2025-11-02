import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { buySharesValidation } from '../../domain/buySharesValidation.ts';
import { GameError, GameErrorCodes, type Hotel, type Player } from '../../types/index.ts';

function makeHotel(name: string, bankShares = 25): Hotel {
  return {
    name: name as any,
    shares: Array.from(
      { length: 25 },
      (_, i) => ({ location: i < bankShares ? 'bank' : 1 } as any),
    ),
  } as Hotel;
}

function boardFor(hotelName: string, count = 2) {
  return Array.from(
    { length: count },
    (_, i) => ({ row: i, col: 0, location: 'board', hotel: hotelName }),
  );
}

Deno.test('buySharesValidation basic checks', async (t) => {
  await t.step('throws when buying more than 3 shares', () => {
    const player: Player = { id: 1, name: 'P1', money: 10000 };
    const hotels = [makeHotel('Worldwide')];
    const board = boardFor('Worldwide', 2);

    const shares = { Worldwide: 2, Sackson: 2 } as unknown as Record<string, number>;

    const err = assertThrows(
      () => buySharesValidation(player, shares as any, board as any, hotels),
      GameError,
    );
    assertEquals(err?.message.includes('Only 3 shares'), true);
    assertEquals((err as any).code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws when buying zero shares for a hotel', () => {
    const player: Player = { id: 1, name: 'P1', money: 10000 };
    const hotels = [makeHotel('Worldwide')];
    const board = boardFor('Worldwide', 2);

    const shares = { Worldwide: 0 } as unknown as Record<string, number>;
    const err = assertThrows(
      () => buySharesValidation(player, shares as any, board as any, hotels),
      GameError,
    );
    assertEquals((err as any).code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws when hotel does not exist', () => {
    const player: Player = { id: 1, name: 'P1', money: 10000 };
    const hotels: Hotel[] = [makeHotel('Worldwide')];
    const board = boardFor('Worldwide', 2);

    const shares = { Festival: 1 } as unknown as Record<string, number>;
    const err = assertThrows(
      () => buySharesValidation(player, shares as any, board as any, hotels),
      GameError,
    );
    assertEquals((err as any).code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step("throws when hotel doesn't have enough shares", () => {
    const player: Player = { id: 1, name: 'P1', money: 10000 };
    // Hotel with only 1 bank share
    const hotels: Hotel[] = [makeHotel('Worldwide', 1)];
    const board = boardFor('Worldwide', 2);

    const shares = { Worldwide: 2 } as unknown as Record<string, number>;
    const err = assertThrows(
      () => buySharesValidation(player, shares as any, board as any, hotels),
      GameError,
    );
    assertEquals((err as any).code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws when player has insufficient money', () => {
    const player: Player = { id: 1, name: 'P1', money: 100 };
    const hotels: Hotel[] = [makeHotel('Worldwide')];
    // board with size 2 -> economy price 200 per share
    const board = boardFor('Worldwide', 2);

    const shares = { Worldwide: 1 } as unknown as Record<string, number>;
    const err = assertThrows(
      () => buySharesValidation(player, shares as any, board as any, hotels),
      GameError,
    );
    assertEquals((err as any).code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('allows valid purchase', () => {
    const player: Player = { id: 1, name: 'P1', money: 10000 };
    const hotels: Hotel[] = [makeHotel('Worldwide')];
    const board = boardFor('Worldwide', 2);

    const shares = { Worldwide: 3 } as unknown as Record<string, number>;
    // should not throw
    buySharesValidation(player, shares as any, board as any, hotels);
  });
});
