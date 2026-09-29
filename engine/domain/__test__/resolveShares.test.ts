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

const owned = (hotel: { shares: { location: unknown }[] }, playerId: number) =>
  hotel.shares.filter((s) => s.location === playerId).length;

Deno.test('resolveShares trade and sell behavior', () => {
  const playerId = 1;
  const survivor = makeHotel('Worldwide', 0);
  const merged = makeHotel('Luxor', 5);

  const result = resolveShares(playerId, 3, survivor, merged, { sell: 2, trade: 2 });

  // For economy hotels, size 3 -> price 300
  assertEquals(result.income, 300 * 2);
  // survivor should have received traded shares (trade / 2)
  assertEquals(result.survivorShares.filter((s) => s.location === playerId).length, 1);
  // 5 owned, sold 2 and traded 2
  assertEquals(owned({ shares: result.mergedShares }, playerId), 1);
  assertEquals(
    result.action,
    'traded 2 shares of Luxor for 1 of Worldwide, sold 2 shares of Luxor for $600, kept 1 shares of Luxor',
  );
});

Deno.test('resolveShares prices sold shares by the merged size, not the board', () => {
  // Luxor at size 7 is in the 6-10 bracket
  const result = resolveShares(1, 7, makeHotel('Worldwide'), makeHotel('Luxor', 2), {
    sell: 2,
    trade: 0,
  });
  assertEquals(result.income, 600 * 2);
  assertEquals(result.action, 'sold 2 shares of Luxor for $1200');
});

Deno.test('resolveShares keeps all shares when none are sold or traded', () => {
  const merged = makeHotel('Luxor', 3);
  for (const shares of [undefined, { sell: 0, trade: 0 }]) {
    const result = resolveShares(1, 3, makeHotel('Worldwide'), merged, shares);
    assertEquals(result.income, 0);
    assertEquals(owned({ shares: result.mergedShares }, 1), 3);
    assertEquals(result.action, 'kept 3 shares of Luxor');
  }
});

Deno.test('resolveShares does not report kept shares when all are disposed of', () => {
  const result = resolveShares(1, 3, makeHotel('Worldwide'), makeHotel('Luxor', 4), {
    sell: 0,
    trade: 4,
  });
  assertEquals(result.action, 'traded 4 shares of Luxor for 2 of Worldwide');
});
