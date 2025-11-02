import { assertEquals } from 'jsr:@std/assert';
import { resolveShares } from '../../domain/hotelOperations.ts';
import { type Hotel } from '../../types/index.ts';

function makeHotel(name: string, playerOwned = 0): Hotel {
  const shares = Array.from(
    { length: 25 },
    (_, i) => ({ location: i < playerOwned ? 1 : 'bank' } as any),
  );
  return { name: name as any, shares } as Hotel;
}

function boardFor(hotelName: string, count = 3) {
  return Array.from(
    { length: count },
    (_, i) => ({ row: i, col: 0, location: 'board', hotel: hotelName }),
  );
}

Deno.test('resolveShares trade and sell behavior', () => {
  const playerId = 1;
  const survivor = makeHotel('Worldwide', 0);
  // merged hotel has 3 shares owned by player
  const merged = makeHotel('Sackson', 3);
  const board = boardFor('Sackson', 3);

  const result = resolveShares(playerId, board as any, survivor, merged, { sell: 2, trade: 2 });

  // income should be sharePrice(3 tiles economy) * sell (2)
  // For economy hotels, size 3 -> price 300
  assertEquals(result.income, 300 * 2);

  // survivor should have received traded shares (trade / 2)
  const survivorOwned = result.survivorShares.filter((s) => s.location === playerId).length;
  assertEquals(survivorOwned, 1);

  // merged shares should have returned sold+traded shares to bank
  const mergedOwned = result.mergedShares.filter((s) => s.location === playerId).length;
  // originally 3 owned, sold 2 and traded 2 -> net owned should be 3 - 4 = -1 -> floored to 0
  assertEquals(mergedOwned, 0);
});
