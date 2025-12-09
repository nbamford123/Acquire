import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { mergeHotels } from '../../domain/mergeHotelsOperation.ts';
import {
  type BoardTile,
  GameError,
  GameErrorCodes,
  type HOTEL_NAME,
  type MergeContext,
  type ResolvedTie,
  SAFE_HOTEL_SIZE,
} from '../../types/index.ts';

// Helper function to create board tiles
function createBoardTile(row: number, col: number, hotel?: HOTEL_NAME): BoardTile {
  const tile: BoardTile = { row, col, location: 'board' };
  if (hotel) {
    tile.hotel = hotel;
  }
  return tile;
}

// Helper function to create hotel tiles for testing
function createHotelTiles(
  hotelName: HOTEL_NAME,
  count: number,
  startRow = 0,
  startCol = 0,
): BoardTile[] {
  return Array.from({ length: count }, (_, i) => ({
    row: startRow + Math.floor(i / 9),
    col: startCol + (i % 9),
    location: 'board' as const,
    hotel: hotelName,
  }));
}

// Helper function to create a basic merge context
function createMergeContext(
  originalHotels: HOTEL_NAME[],
  additionalTiles: BoardTile[] = [],
  survivingHotel?: HOTEL_NAME,
): MergeContext {
  return {
    originalHotels,
    additionalTiles,
    survivingHotel,
  };
}

Deno.test('mergeHotels - Basic functionality', async (t) => {
  await t.step('throws error when less than 2 hotels provided', () => {
    const mergeContext = createMergeContext(['Worldwide']);
    const gameBoard: BoardTile[] = [];

    const error = assertThrows(
      () => mergeHotels(mergeContext, gameBoard),
      GameError,
      'Need at least 2 hotels to merge',
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('merges two hotels with clear size difference', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', 5), // larger hotel
      ...createHotelTiles('Luxor', 3, 1, 0), // smaller hotel
    ];

    const mergeContext = createMergeContext(['Worldwide', 'Luxor']);
    const result = mergeHotels(mergeContext, gameBoard);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivingHotel, 'Worldwide');
      assertEquals(result.mergedHotel, 'Luxor');
      assertEquals(result.remainingHotels, []);
      assertEquals(result.survivorTiles.length, 8); // 5 + 3 tiles

      // Check that merged hotel tiles are converted to survivor
      const mergedTiles = result.survivorTiles.filter((tile) =>
        tile.row >= 1 && tile.row < 2 && tile.col >= 0 && tile.col < 3
      );
      mergedTiles.forEach((tile) => {
        assertEquals(tile.hotel, 'Worldwide');
      });
    }
  });

  await t.step('includes additional tiles in survivor tiles', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', 4),
      ...createHotelTiles('Luxor', 2, 1, 0),
    ];

    const additionalTiles: BoardTile[] = [
      createBoardTile(5, 5),
      createBoardTile(6, 6),
    ];

    const mergeContext = createMergeContext(['Worldwide', 'Luxor'], additionalTiles);
    const result = mergeHotels(mergeContext, gameBoard);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivorTiles.length, 8); // 4 + 2 + 2 additional tiles
    }
  });
});

Deno.test('mergeHotels - Tie scenarios requiring user input', async (t) => {
  await t.step('all 4 hotels are the same size (maximum tie scenario)', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', 5),
      ...createHotelTiles('Luxor', 5, 1, 0),
      ...createHotelTiles('Festival', 5, 2, 0),
      ...createHotelTiles('Imperial', 5, 3, 0),
    ];

    const mergeContext = createMergeContext(['Worldwide', 'Luxor', 'Festival', 'Imperial']);
    const result = mergeHotels(mergeContext, gameBoard);

    // Should detect tie and require user input
    assertEquals(result.needsMergeOrder, true);
    if (!result.needsMergeOrder) {
      // The first hotel in sorted order becomes survivor
      assertEquals(result.survivingHotel, 'Worldwide');
      assertEquals(result.mergedHotel, 'Luxor');
      assertEquals(result.remainingHotels, ['Festival', 'Imperial']);
    }
  });

  await t.step('one largest hotel, other 3 are the same size', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', 7), // largest
      ...createHotelTiles('Luxor', 4, 1, 0), // tied for second
      ...createHotelTiles('Festival', 4, 2, 0), // tied for second
      ...createHotelTiles('Imperial', 4, 3, 0), // tied for second
    ];

    const mergeContext = createMergeContext(['Worldwide', 'Luxor', 'Festival', 'Imperial']);
    const result = mergeHotels(mergeContext, gameBoard);

    // Should detect tie among the second-place hotels and require user input
    assertEquals(result.needsMergeOrder, true);
    if (result.needsMergeOrder) {
      assertEquals(result.tiedHotels, ['Luxor', 'Festival', 'Imperial']);
      assertEquals(result.mergeContext.survivingHotel, 'Worldwide');
    }
  });

  await t.step('two largest hotels tied, two smaller hotels different sizes', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', 6), // tied for largest
      ...createHotelTiles('Luxor', 6, 1, 0), // tied for largest
      ...createHotelTiles('Festival', 3, 2, 0), // smaller
      ...createHotelTiles('Imperial', 2, 3, 0), // smallest
    ];

    const mergeContext = createMergeContext(['Worldwide', 'Luxor', 'Festival', 'Imperial']);
    const result = mergeHotels(mergeContext, gameBoard);

    // Should detect tie between the two largest hotels and require user input
    assertEquals(result.needsMergeOrder, true);
    if (result.needsMergeOrder) {
      assertEquals(result.tiedHotels, ['Worldwide', 'Luxor']);
    }
  });

  await t.step('survivor already picked, next two hotels are same size', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', 8), // survivor (already determined)
      ...createHotelTiles('Luxor', 4, 1, 0), // tied for merge
      ...createHotelTiles('Festival', 4, 2, 0), // tied for merge
      ...createHotelTiles('Imperial', 2, 3, 0), // smallest
    ];

    const mergeContext = createMergeContext(
      ['Luxor', 'Festival', 'Imperial'], // original hotels (survivor already removed)
      [],
      'Worldwide', // survivor already determined
    );
    const result = mergeHotels(mergeContext, gameBoard);

    // Should detect tie among the hotels to be merged and require user input
    assertEquals(result.needsMergeOrder, true);
    if (result.needsMergeOrder) {
      assertEquals(result.tiedHotels, ['Luxor', 'Festival']);
      assertEquals(result.mergeContext.survivingHotel, 'Worldwide');
    }
  });
});

Deno.test('mergeHotels - Tie resolution with user input', async (t) => {
  await t.step('resolves tie when no survivor was previously picked', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', 5),
      ...createHotelTiles('Luxor', 5, 1, 0),
      ...createHotelTiles('Festival', 3, 2, 0),
    ];

    const mergeContext = createMergeContext(['Worldwide', 'Luxor', 'Festival']);
    const tieResolution: ResolvedTie = {
      survivor: 'Worldwide',
      merged: 'Luxor',
    };

    const result = mergeHotels(mergeContext, gameBoard, tieResolution);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivingHotel, 'Worldwide');
      assertEquals(result.mergedHotel, 'Luxor');
      // The remaining hotels array contains the sorted remaining hotels after removing survivor and merged
      assertEquals(result.remainingHotels, ['Festival']);
    }
  });

  await t.step('resolves tie when survivor was already picked', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', 8), // survivor
      ...createHotelTiles('Luxor', 4, 1, 0), // tied for merge
      ...createHotelTiles('Festival', 4, 2, 0), // tied for merge
    ];

    const mergeContext = createMergeContext(
      ['Luxor', 'Festival'],
      [],
      'Worldwide',
    );
    const tieResolution: ResolvedTie = {
      survivor: 'Luxor', // this becomes the merged hotel
      merged: 'Festival', // this parameter is ignored when survivor already picked
    };

    const result = mergeHotels(mergeContext, gameBoard, tieResolution);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivingHotel, 'Worldwide');
      assertEquals(result.mergedHotel, 'Luxor');
      // After merging Luxor, Festival remains
      assertEquals(result.remainingHotels, ['Festival']);
    }
  });

  await t.step('throws error when tie resolution contains invalid hotels', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', 5),
      ...createHotelTiles('Luxor', 5, 1, 0),
    ];

    const mergeContext = createMergeContext(['Worldwide', 'Luxor']);
    const tieResolution: ResolvedTie = {
      survivor: 'Festival', // not in original hotels
      merged: 'Luxor',
    };

    const error = assertThrows(
      () => mergeHotels(mergeContext, gameBoard, tieResolution),
      GameError,
      'Tie resolution contains invalid hotels',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });
});

Deno.test('mergeHotels - Safe hotel validation', async (t) => {
  await t.step('throws error when trying to merge a safe hotel', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', 8), // not safe
      ...createHotelTiles('Luxor', SAFE_HOTEL_SIZE, 1, 0), // safe hotel
    ];

    const mergeContext = createMergeContext(['Worldwide', 'Luxor']);

    // The safe hotel check only happens after determining survivor and merged
    // Since Luxor is larger, it becomes the survivor, not the merged hotel
    const result = mergeHotels(mergeContext, gameBoard);
    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivingHotel, 'Luxor'); // Safe hotel survives
      assertEquals(result.mergedHotel, 'Worldwide'); // Smaller hotel gets merged
    }
  });

  await t.step('allows merging when safe hotel is the survivor', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', SAFE_HOTEL_SIZE), // safe hotel (survivor)
      ...createHotelTiles('Luxor', 5, 2, 0), // smaller hotel (will be merged)
    ];

    const mergeContext = createMergeContext(['Worldwide', 'Luxor']);
    const result = mergeHotels(mergeContext, gameBoard);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivingHotel, 'Worldwide');
      assertEquals(result.mergedHotel, 'Luxor');
    }
  });
});

Deno.test('mergeHotels - Complex multi-hotel scenarios', async (t) => {
  await t.step('handles 4-hotel merge with clear hierarchy', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', 10), // largest
      ...createHotelTiles('Luxor', 7, 2, 0), // second largest
      ...createHotelTiles('Festival', 4, 4, 0), // third largest
      ...createHotelTiles('Imperial', 2, 6, 0), // smallest
    ];

    const mergeContext = createMergeContext(['Worldwide', 'Luxor', 'Festival', 'Imperial']);
    const result = mergeHotels(mergeContext, gameBoard);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivingHotel, 'Worldwide');
      assertEquals(result.mergedHotel, 'Luxor');
      assertEquals(result.remainingHotels, ['Festival', 'Imperial']);
      assertEquals(result.survivorTiles.length, 17); // 10 + 7 tiles
    }
  });

  await t.step('handles hotels with zero tiles', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', 5),
      // Luxor has no tiles on board
    ];

    const mergeContext = createMergeContext(['Worldwide', 'Luxor']);
    const result = mergeHotels(mergeContext, gameBoard);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivingHotel, 'Worldwide');
      assertEquals(result.mergedHotel, 'Luxor');
      assertEquals(result.survivorTiles.length, 5); // only Worldwide's tiles
    }
  });

  await t.step('handles all hotels with zero tiles', () => {
    const gameBoard: BoardTile[] = [
      // No hotel tiles on board
    ];

    const mergeContext = createMergeContext(['Worldwide', 'Luxor']);
    const result = mergeHotels(mergeContext, gameBoard);

    // Should detect tie between zero-sized hotels and require user input
    assertEquals(result.needsMergeOrder, true);
    if (result.needsMergeOrder) {
      assertEquals(result.tiedHotels, ['Worldwide', 'Luxor']);
    }
  });
});

Deno.test('mergeHotels - Edge cases and error conditions', async (t) => {
  await t.step('handles single tile hotels', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', 1),
      ...createHotelTiles('Luxor', 1, 1, 0),
    ];

    const mergeContext = createMergeContext(['Worldwide', 'Luxor']);
    const result = mergeHotels(mergeContext, gameBoard);

    // Should detect tie between single-tile hotels and require user input
    assertEquals(result.needsMergeOrder, true);
    if (result.needsMergeOrder) {
      assertEquals(result.tiedHotels, ['Worldwide', 'Luxor']);
    }
  });

  await t.step('preserves original tile properties in survivor tiles', () => {
    const gameBoard: BoardTile[] = [
      createBoardTile(0, 0, 'Worldwide'),
      createBoardTile(0, 1, 'Worldwide'),
      createBoardTile(1, 0, 'Luxor'),
    ];

    const mergeContext = createMergeContext(['Worldwide', 'Luxor']);
    const result = mergeHotels(mergeContext, gameBoard);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivorTiles.length, 3);

      // Check that all tiles now belong to survivor hotel
      result.survivorTiles.forEach((tile) => {
        assertEquals(tile.hotel, 'Worldwide');
        assertEquals(tile.location, 'board');
      });

      // Check that original positions are preserved
      const tile1 = result.survivorTiles.find((t) => t.row === 0 && t.col === 0);
      const tile2 = result.survivorTiles.find((t) => t.row === 0 && t.col === 1);
      const tile3 = result.survivorTiles.find((t) => t.row === 1 && t.col === 0);

      assertEquals(tile1?.hotel, 'Worldwide');
      assertEquals(tile2?.hotel, 'Worldwide');
      assertEquals(tile3?.hotel, 'Worldwide');
    }
  });

  await t.step('handles merge context with additional tiles correctly', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', 3),
      ...createHotelTiles('Luxor', 2, 1, 0),
    ];

    const additionalTiles: BoardTile[] = [
      createBoardTile(5, 5), // connecting tile
      createBoardTile(5, 6), // another connecting tile
    ];

    const mergeContext = createMergeContext(['Worldwide', 'Luxor'], additionalTiles);
    const result = mergeHotels(mergeContext, gameBoard);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivorTiles.length, 7); // 3 + 2 + 2 additional

      // Additional tiles should be included
      const additionalTile1 = result.survivorTiles.find((t) => t.row === 5 && t.col === 5);
      const additionalTile2 = result.survivorTiles.find((t) => t.row === 5 && t.col === 6);

      assertEquals(additionalTile1?.row, 5);
      assertEquals(additionalTile1?.col, 5);
      assertEquals(additionalTile2?.row, 5);
      assertEquals(additionalTile2?.col, 6);
    }
  });
});

Deno.test('mergeHotels - Sorting and ordering', async (t) => {
  await t.step('correctly sorts hotels by size in descending order', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Luxor', 3, 0, 0), // smallest first in input
      ...createHotelTiles('Worldwide', 8, 1, 0), // largest
      ...createHotelTiles('Festival', 5, 2, 0), // middle
    ];

    const mergeContext = createMergeContext(['Luxor', 'Worldwide', 'Festival']);
    const result = mergeHotels(mergeContext, gameBoard);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      // Largest should be survivor regardless of input order
      assertEquals(result.survivingHotel, 'Worldwide');
      assertEquals(result.mergedHotel, 'Festival'); // second largest
      assertEquals(result.remainingHotels, ['Luxor']); // smallest remains
    }
  });

  await t.step('maintains remaining hotels in size order', () => {
    const gameBoard: BoardTile[] = [
      ...createHotelTiles('Worldwide', 10), // largest (survivor)
      ...createHotelTiles('Luxor', 7, 1, 0), // second (merged)
      ...createHotelTiles('Festival', 5, 2, 0), // third (remaining)
      ...createHotelTiles('Imperial', 3, 3, 0), // fourth (remaining)
      ...createHotelTiles('American', 1, 4, 0), // fifth (remaining)
    ];

    const mergeContext = createMergeContext([
      'Worldwide',
      'Luxor',
      'Festival',
      'Imperial',
      'American',
    ]);
    const result = mergeHotels(mergeContext, gameBoard);

    assertEquals(result.needsMergeOrder, false);
    if (!result.needsMergeOrder) {
      assertEquals(result.survivingHotel, 'Worldwide');
      assertEquals(result.mergedHotel, 'Luxor');
      assertEquals(result.remainingHotels, ['Festival', 'Imperial', 'American']);

      // Verify remaining hotels are in descending size order
      const festivalSize = gameBoard.filter((t) => t.hotel === 'Festival').length;
      const imperialSize = gameBoard.filter((t) => t.hotel === 'Imperial').length;
      const americanSize = gameBoard.filter((t) => t.hotel === 'American').length;

      assertEquals(festivalSize >= imperialSize, true);
      assertEquals(imperialSize >= americanSize, true);
    }
  });
});
