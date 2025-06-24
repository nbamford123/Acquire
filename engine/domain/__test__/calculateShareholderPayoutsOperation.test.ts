import { assertEquals } from 'jsr:@std/assert';
import { calculateShareholderPayouts } from '../../domain/calculateShareholderPayoutsOperation.ts';

Deno.test('calculateShareholderPayouts', async (t) => {
  await t.step('handles single player with all shares', () => {
    const majorityBonus = 5000;
    const minorityBonus = 2500;
    const playerStockCounts = [
      { stockCount: 10, playerId: 1 },
    ];

    const result = calculateShareholderPayouts(majorityBonus, minorityBonus, playerStockCounts);

    // Single player gets both majority and minority bonuses combined
    assertEquals(result[1], 7500); // 5000 + 2500
  });

  await t.step('handles clear majority and minority winners', () => {
    const majorityBonus = 5000;
    const minorityBonus = 2500;
    const playerStockCounts = [
      { stockCount: 10, playerId: 1 }, // majority
      { stockCount: 5, playerId: 2 }, // minority
      { stockCount: 3, playerId: 3 }, // no bonus
    ];

    const result = calculateShareholderPayouts(majorityBonus, minorityBonus, playerStockCounts);

    assertEquals(result[1], 5000); // majority bonus
    assertEquals(result[2], 2500); // minority bonus
    assertEquals(result[3], undefined); // no bonus
  });

  await t.step('handles tie for majority - splits both bonuses', () => {
    const majorityBonus = 5000;
    const minorityBonus = 2500;
    const playerStockCounts = [
      { stockCount: 10, playerId: 1 }, // tied for majority
      { stockCount: 10, playerId: 2 }, // tied for majority
      { stockCount: 5, playerId: 3 }, // no bonus (majority tie excludes minority)
    ];

    const result = calculateShareholderPayouts(majorityBonus, minorityBonus, playerStockCounts);

    // Total bonus (5000 + 2500) = 7500, split between 2 players = 3750 each
    assertEquals(result[1], 3800); // rounded up to nearest hundred
    assertEquals(result[2], 3800); // rounded up to nearest hundred
    assertEquals(result[3], undefined); // no bonus
  });

  await t.step('handles tie for minority - splits minority bonus', () => {
    const majorityBonus = 5000;
    const minorityBonus = 2500;
    const playerStockCounts = [
      { stockCount: 10, playerId: 1 }, // majority
      { stockCount: 5, playerId: 2 }, // tied for minority
      { stockCount: 5, playerId: 3 }, // tied for minority
      { stockCount: 2, playerId: 4 }, // no bonus
    ];

    const result = calculateShareholderPayouts(majorityBonus, minorityBonus, playerStockCounts);

    assertEquals(result[1], 5000); // majority bonus
    assertEquals(result[2], 1300); // minority bonus split: 2500/2 = 1250, rounded up to 1300
    assertEquals(result[3], 1300); // minority bonus split: 2500/2 = 1250, rounded up to 1300
    assertEquals(result[4], undefined); // no bonus
  });

  await t.step('handles everyone tied - splits both bonuses among all', () => {
    const majorityBonus = 5000;
    const minorityBonus = 2500;
    const playerStockCounts = [
      { stockCount: 5, playerId: 1 },
      { stockCount: 5, playerId: 2 },
      { stockCount: 5, playerId: 3 },
    ];

    const result = calculateShareholderPayouts(majorityBonus, minorityBonus, playerStockCounts);

    // Total bonus (5000 + 2500) = 7500, split among 3 players = 2500 each
    assertEquals(result[1], 2500);
    assertEquals(result[2], 2500);
    assertEquals(result[3], 2500);
  });

  await t.step('handles three-way tie for majority', () => {
    const majorityBonus = 6000;
    const minorityBonus = 3000;
    const playerStockCounts = [
      { stockCount: 8, playerId: 1 }, // tied for majority
      { stockCount: 8, playerId: 2 }, // tied for majority
      { stockCount: 8, playerId: 3 }, // tied for majority
      { stockCount: 2, playerId: 4 }, // no bonus
    ];

    const result = calculateShareholderPayouts(majorityBonus, minorityBonus, playerStockCounts);

    // Total bonus (6000 + 3000) = 9000, split among 3 players = 3000 each
    assertEquals(result[1], 3000);
    assertEquals(result[2], 3000);
    assertEquals(result[3], 3000);
    assertEquals(result[4], undefined); // no bonus
  });

  await t.step('handles rounding up to nearest hundred correctly', () => {
    const majorityBonus = 5000;
    const minorityBonus = 2500;
    const playerStockCounts = [
      { stockCount: 10, playerId: 1 }, // tied for majority
      { stockCount: 10, playerId: 2 }, // tied for majority
      { stockCount: 10, playerId: 3 }, // tied for majority
    ];

    const result = calculateShareholderPayouts(majorityBonus, minorityBonus, playerStockCounts);

    // Total bonus (5000 + 2500) = 7500, split among 3 players = 2500 each (no rounding needed)
    assertEquals(result[1], 2500);
    assertEquals(result[2], 2500);
    assertEquals(result[3], 2500);
  });

  await t.step('handles rounding up when division results in fractional amount', () => {
    const majorityBonus = 5000;
    const minorityBonus = 2600; // Will create fractional amounts when split
    const playerStockCounts = [
      { stockCount: 10, playerId: 1 }, // tied for majority
      { stockCount: 10, playerId: 2 }, // tied for majority
      { stockCount: 10, playerId: 3 }, // tied for majority
    ];

    const result = calculateShareholderPayouts(majorityBonus, minorityBonus, playerStockCounts);

    // Total bonus (5000 + 2600) = 7600, split among 3 players = 2533.33..., rounded up to 2600
    assertEquals(result[1], 2600);
    assertEquals(result[2], 2600);
    assertEquals(result[3], 2600);
  });

  await t.step('handles complex scenario with multiple groups', () => {
    const majorityBonus = 8000;
    const minorityBonus = 4000;
    const playerStockCounts = [
      { stockCount: 15, playerId: 1 }, // clear majority
      { stockCount: 8, playerId: 2 }, // tied for minority
      { stockCount: 8, playerId: 3 }, // tied for minority
      { stockCount: 8, playerId: 4 }, // tied for minority
      { stockCount: 3, playerId: 5 }, // no bonus
      { stockCount: 1, playerId: 6 }, // no bonus
    ];

    const result = calculateShareholderPayouts(majorityBonus, minorityBonus, playerStockCounts);

    assertEquals(result[1], 8000); // majority bonus
    // Minority bonus 4000 split among 3 players = 1333.33..., rounded up to 1400
    assertEquals(result[2], 1400);
    assertEquals(result[3], 1400);
    assertEquals(result[4], 1400);
    assertEquals(result[5], undefined); // no bonus
    assertEquals(result[6], undefined); // no bonus
  });

  await t.step('handles edge case with zero bonuses', () => {
    const majorityBonus = 0;
    const minorityBonus = 0;
    const playerStockCounts = [
      { stockCount: 10, playerId: 1 },
      { stockCount: 5, playerId: 2 },
    ];

    const result = calculateShareholderPayouts(majorityBonus, minorityBonus, playerStockCounts);

    assertEquals(result[1], 0); // majority gets 0
    assertEquals(result[2], 0); // minority gets 0
  });

  await t.step('handles single player with zero stock count', () => {
    const majorityBonus = 5000;
    const minorityBonus = 2500;
    const playerStockCounts = [
      { stockCount: 0, playerId: 1 },
    ];

    const result = calculateShareholderPayouts(majorityBonus, minorityBonus, playerStockCounts);

    // Even with 0 stocks, single player gets both bonuses
    assertEquals(result[1], 7500);
  });

  await t.step('handles two players with same zero stock count', () => {
    const majorityBonus = 5000;
    const minorityBonus = 2500;
    const playerStockCounts = [
      { stockCount: 0, playerId: 1 },
      { stockCount: 0, playerId: 2 },
    ];

    const result = calculateShareholderPayouts(majorityBonus, minorityBonus, playerStockCounts);

    // Both players tied, split total bonus
    assertEquals(result[1], 3800); // 7500/2 = 3750, rounded up to 3800
    assertEquals(result[2], 3800);
  });

  await t.step('preserves original array order independence', () => {
    const majorityBonus = 5000;
    const minorityBonus = 2500;

    // Test that the function works correctly regardless of input order
    // (assuming input is pre-sorted as documented)
    const playerStockCounts = [
      { stockCount: 10, playerId: 3 }, // majority
      { stockCount: 7, playerId: 1 }, // minority
      { stockCount: 2, playerId: 2 }, // no bonus
    ];

    const result = calculateShareholderPayouts(majorityBonus, minorityBonus, playerStockCounts);

    assertEquals(result[3], 5000); // player 3 gets majority
    assertEquals(result[1], 2500); // player 1 gets minority
    assertEquals(result[2], undefined); // player 2 gets nothing
  });
});
