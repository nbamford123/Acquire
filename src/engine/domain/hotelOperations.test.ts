import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { expect } from 'jsr:@std/expect';
import {
  findHotel,
  hotelSafe,
  initializeHotels,
  mergeHotels,
  remainingShares,
  sharePrice,
} from './hotelOperations.ts';
import {
  GameError,
  GameErrorCodes,
  type Hotel,
  type HOTEL_NAME,
  type HOTEL_TYPE,
  SharePrices,
  type Tile,
} from '@/engine/types/index.ts';
import { SAFE_HOTEL_SIZE } from '@/engine/config/gameConfig.ts';

// Helper function to create a hotel
function createHotel(
  name: HOTEL_NAME,
  type: HOTEL_TYPE,
  tileCount: number = 0,
  sharesInBank: number = 25,
): Hotel {
  const shares = Array.from({ length: 25 }, (_, i) => ({
    location: i < sharesInBank ? 'bank' as const : 1,
  }));

  const tiles: Tile[] = Array.from({ length: tileCount }, (_, i) => ({
    row: Math.floor(i / 9),
    col: i % 9,
    location: 'board' as const,
  }));

  return {
    name,
    type,
    shares,
    tiles,
  };
}

// Helper function to create a tile
function createTile(row: number, col: number, location: 'board' | 'bag' | number = 'board'): Tile {
  return { row, col, location };
}

Deno.test('initializeHotels', async (t) => {
  await t.step('creates all 7 hotels with correct properties', () => {
    const hotels = initializeHotels();

    assertEquals(hotels.length, 7);

    // Check each hotel has correct name, type, and initial state
    const expectedHotels = [
      { name: 'Worldwide', type: 'economy' },
      { name: 'Sackson', type: 'economy' },
      { name: 'Festival', type: 'standard' },
      { name: 'Imperial', type: 'standard' },
      { name: 'American', type: 'standard' },
      { name: 'Continental', type: 'luxury' },
      { name: 'Tower', type: 'luxury' },
    ];

    expectedHotels.forEach((expected, index) => {
      assertEquals(hotels[index].name, expected.name);
      assertEquals(hotels[index].type, expected.type);
      assertEquals(hotels[index].shares.length, 25);
      assertEquals(hotels[index].tiles.length, 0);

      // All shares should be in bank initially
      hotels[index].shares.forEach((share) => {
        assertEquals(share.location, 'bank');
      });
    });
  });
});

Deno.test('remainingShares', async (t) => {
  await t.step('returns 25 for new hotel', () => {
    const hotel = createHotel('Worldwide', 'economy');
    assertEquals(remainingShares(hotel), 25);
  });

  await t.step('returns correct count when some shares are owned', () => {
    const hotel = createHotel('Worldwide', 'economy', 0, 20);
    assertEquals(remainingShares(hotel), 20);
  });

  await t.step('returns 0 when all shares are owned', () => {
    const hotel = createHotel('Worldwide', 'economy', 0, 0);
    assertEquals(remainingShares(hotel), 0);
  });
});

Deno.test('sharePrice', async (t) => {
  await t.step('calculates correct price for economy hotel at different sizes', () => {
    // Test various sizes for economy hotel
    const testCases = [
      { size: 2, expectedPrice: 200 },
      { size: 3, expectedPrice: 300 },
      { size: 4, expectedPrice: 400 },
      { size: 5, expectedPrice: 500 },
      { size: 10, expectedPrice: 600 },
      { size: 20, expectedPrice: 700 },
      { size: 30, expectedPrice: 800 },
      { size: 40, expectedPrice: 900 },
      { size: 50, expectedPrice: 1000 },
    ];

    testCases.forEach(({ size, expectedPrice }) => {
      const hotel = createHotel('Worldwide', 'economy', size);
      assertEquals(sharePrice(hotel), expectedPrice);
    });
  });

  await t.step('calculates correct price for standard hotel', () => {
    const hotel = createHotel('Festival', 'standard', 5);
    assertEquals(sharePrice(hotel), 600);
  });

  await t.step('calculates correct price for luxury hotel', () => {
    const hotel = createHotel('Continental', 'luxury', 5);
    assertEquals(sharePrice(hotel), 700);
  });

  await t.step('handles edge case of 1 tile (should use 2-tile bracket)', () => {
    const hotel = createHotel('Worldwide', 'economy', 1);
    assertEquals(sharePrice(hotel), 200);
  });

  await t.step('handles very large hotels', () => {
    const hotel = createHotel('Tower', 'luxury', 100);
    assertEquals(sharePrice(hotel), 1200);
  });
});

Deno.test('findHotel', async (t) => {
  await t.step('finds hotel containing the tile', () => {
    const tile = createTile(0, 0);
    const hotel1 = createHotel('Worldwide', 'economy');
    const hotel2 = createHotel('Sackson', 'economy');
    hotel2.tiles.push(tile);

    const hotels = [hotel1, hotel2];
    const found = findHotel(tile, hotels);

    assertEquals(found, hotel2);
  });

  await t.step('returns undefined when tile not found in any hotel', () => {
    const tile = createTile(0, 0);
    const hotel1 = createHotel('Worldwide', 'economy');
    const hotel2 = createHotel('Sackson', 'economy');

    const hotels = [hotel1, hotel2];
    const found = findHotel(tile, []);

    assertEquals(found, undefined);
  });

  await t.step('returns undefined for empty hotels array', () => {
    const tile = createTile(0, 0);
    const found = findHotel(tile, []);

    assertEquals(found, undefined);
  });
});

Deno.test('hotelSafe', async (t) => {
  await t.step('returns false for undefined hotel', () => {
    assertEquals(hotelSafe(undefined), false);
  });

  await t.step('returns false for hotel with less than safe size', () => {
    const hotel = createHotel('Worldwide', 'economy', SAFE_HOTEL_SIZE - 1);
    assertEquals(hotelSafe(hotel), false);
  });

  await t.step('returns true for hotel with exactly safe size', () => {
    const hotel = createHotel('Worldwide', 'economy', SAFE_HOTEL_SIZE);
    assertEquals(hotelSafe(hotel), true);
  });

  await t.step('returns true for hotel larger than safe size', () => {
    const hotel = createHotel('Worldwide', 'economy', SAFE_HOTEL_SIZE + 5);
    assertEquals(hotelSafe(hotel), true);
  });
});

Deno.test('mergeHotels', async (t) => {
  await t.step('throws error when called with less than 2 hotels', () => {
    const hotel = createHotel('Worldwide', 'economy', 5);
    const tiles = [createTile(0, 0)];

    const error = assertThrows(
      () => mergeHotels([hotel], tiles),
      GameError,
      'Need at least 2 hotels to merge',
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('throws error when trying to merge safe hotel', () => {
    const hotel1 = createHotel('Worldwide', 'economy', 15); // Large hotel
    const hotel2 = createHotel('Sackson', 'economy', SAFE_HOTEL_SIZE); // Safe hotel
    const tiles = [createTile(0, 0)];

    const error = assertThrows(
      () => mergeHotels([hotel1, hotel2], tiles),
      GameError,
      'Cannot merge safe hotel Sackson',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('successfully merges hotels with clear size difference', () => {
    const largeHotel = createHotel('Worldwide', 'economy', 8);
    const smallHotel = createHotel('Sackson', 'economy', 3);
    const additionalTiles = [createTile(5, 5)];

    const result = mergeHotels([largeHotel, smallHotel], additionalTiles);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivingHotel.name, 'Worldwide');
      assertEquals(result.survivingHotel.tiles.length, 12); // 8 + 3 + 1 (additional tile)
      assertEquals(result.mergedHotel.name, 'Sackson');
      assertEquals(result.mergedHotel.tiles.length, 0);
      assertEquals(result.remainingHotels.length, 0);

      // Check that additional tile is included
      expect(result.survivingHotel.tiles).toContain(additionalTiles[0]);
    }
  });

  await t.step('successfully merges multiple hotels with remaining hotels', () => {
    const largestHotel = createHotel('Worldwide', 'economy', 10);
    const mediumHotel = createHotel('Sackson', 'economy', 5);
    const smallHotel = createHotel('Festival', 'standard', 2);
    const additionalTiles = [createTile(5, 5)];

    const result = mergeHotels([largestHotel, mediumHotel, smallHotel], additionalTiles);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivingHotel.name, 'Worldwide');
      assertEquals(result.survivingHotel.tiles.length, 16); // 10 + 5 + 1 (additional tile)
      assertEquals(result.mergedHotel.name, 'Sackson'); // Second largest becomes merged hotel
      assertEquals(result.mergedHotel.tiles.length, 0);
      assertEquals(result.remainingHotels.length, 1);
      assertEquals(result.remainingHotels[0].name, 'Festival');
    }
  });

  await t.step('requires merge order resolution when hotels have same size', () => {
    const hotel1 = createHotel('Worldwide', 'economy', 5);
    const hotel2 = createHotel('Sackson', 'economy', 5);
    const additionalTiles = [createTile(5, 5)];

    const result = mergeHotels([hotel1, hotel2], additionalTiles);

    assertEquals(result.needsMergeOrder, true);
    if (result.needsMergeOrder) {
      assertEquals(result.tiedHotels.length, 2);
      expect(result.tiedHotels).toContain('Worldwide');
      expect(result.tiedHotels).toContain('Sackson');
    }
  });

  await t.step('applies tie resolution when provided', () => {
    const hotel1 = createHotel('Worldwide', 'economy', 5);
    const hotel2 = createHotel('Sackson', 'economy', 5);
    const additionalTiles = [createTile(5, 5)];

    // Resolve tie in favor of Sackson (survivor, merged)
    const resolvedTie: [HOTEL_NAME, HOTEL_NAME] = ['Sackson', 'Worldwide'];
    const result = mergeHotels([hotel1, hotel2], additionalTiles, undefined, resolvedTie);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivingHotel.name, 'Sackson');
      assertEquals(result.mergedHotel.name, 'Worldwide');
      assertEquals(result.survivingHotel.tiles.length, 11); // 5 + 5 + 1 additional tile
      assertEquals(result.mergedHotel.tiles.length, 0);
    }
  });

  await t.step('handles three-way tie requiring resolution', () => {
    const hotel1 = createHotel('Worldwide', 'economy', 5);
    const hotel2 = createHotel('Sackson', 'economy', 5);
    const hotel3 = createHotel('Festival', 'standard', 5);
    const additionalTiles = [createTile(5, 5)];

    const hotels = [hotel1, hotel2, hotel3];
    const result = mergeHotels(hotels, additionalTiles);

    assertEquals(result.needsMergeOrder, true);
    if (result.needsMergeOrder) {
      assertEquals(result.tiedHotels.length, 3);
      expect(result.tiedHotels).toContain('Worldwide');
      expect(result.tiedHotels).toContain('Sackson');
      expect(result.tiedHotels).toContain('Festival');
    }
  });

  await t.step('handles complex scenario with surviving hotel specified', () => {
    const hotel1 = createHotel('Worldwide', 'economy', 8);
    const hotel2 = createHotel('Sackson', 'economy', 6);
    const hotel3 = createHotel('Festival', 'standard', 4);
    const additionalTiles = [createTile(5, 5), createTile(6, 6)];

    // Specify Sackson as the surviving hotel (even though Worldwide is larger)
    const result = mergeHotels([hotel1, hotel2, hotel3], additionalTiles, hotel2);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivingHotel.name, 'Sackson');
      assertEquals(result.mergedHotel.name, 'Worldwide'); // Largest becomes merged
      assertEquals(result.survivingHotel.tiles.length, 16); // 6 + 8 + 2 additional tiles
      assertEquals(result.mergedHotel.tiles.length, 0);
      assertEquals(result.remainingHotels.length, 1);
      assertEquals(result.remainingHotels[0].name, 'Festival');
    }
  });

  await t.step('handles partial tie resolution with remaining ties', () => {
    const hotel1 = createHotel('Worldwide', 'economy', 5);
    const hotel2 = createHotel('Sackson', 'economy', 5);
    const hotel3 = createHotel('Festival', 'standard', 5);
    const hotel4 = createHotel('Imperial', 'standard', 3);
    const additionalTiles = [createTile(5, 5)];

    // Resolve one tie but leave others
    const resolvedTie: [HOTEL_NAME, HOTEL_NAME] = ['Worldwide', 'Sackson'];
    const result = mergeHotels([hotel1, hotel2, hotel3, hotel4], additionalTiles, undefined, resolvedTie);

    assertEquals(result.needsMergeOrder, true);
    if (result.needsMergeOrder) {
      // Should still need to resolve tie between Sackson and Festival
      assertEquals(result.tiedHotels.length, 2);
      expect(result.tiedHotels).toContain('Sackson');
      expect(result.tiedHotels).toContain('Festival');
    }
  });

  await t.step('prevents merging when safe hotel would be absorbed', () => {
    const largeHotel = createHotel('Worldwide', 'economy', 15);
    const safeHotel = createHotel('Sackson', 'economy', SAFE_HOTEL_SIZE);
    const additionalTiles = [createTile(5, 5)];

    const error = assertThrows(
      () => mergeHotels([largeHotel, safeHotel], additionalTiles),
      GameError,
      'Cannot merge safe hotel Sackson',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('allows safe hotel to survive and absorb smaller hotels', () => {
    const safeHotel = createHotel('Worldwide', 'economy', SAFE_HOTEL_SIZE);
    const smallHotel = createHotel('Sackson', 'economy', 3);
    const additionalTiles = [createTile(5, 5)];

    const result = mergeHotels([safeHotel, smallHotel], additionalTiles);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivingHotel.name, 'Worldwide');
      assertEquals(result.survivingHotel.tiles.length, SAFE_HOTEL_SIZE + 3 + 1); // safe + small + additional
      assertEquals(result.mergedHotel.name, 'Sackson');
      assertEquals(result.mergedHotel.tiles.length, 0);
    }
  });

  await t.step('handles edge case with empty additional tiles', () => {
    const largeHotel = createHotel('Worldwide', 'economy', 8);
    const smallHotel = createHotel('Sackson', 'economy', 3);
    const additionalTiles: Tile[] = [];

    const result = mergeHotels([largeHotel, smallHotel], additionalTiles);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivingHotel.name, 'Worldwide');
      assertEquals(result.survivingHotel.tiles.length, 11); // 8 + 3 + 0 additional
      assertEquals(result.mergedHotel.name, 'Sackson');
      assertEquals(result.mergedHotel.tiles.length, 0);
    }
  });
});
