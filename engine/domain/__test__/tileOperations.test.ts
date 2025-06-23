import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { expect } from 'jsr:@std/expect';
import {
  boardTiles,
  deadTile,
  drawTiles,
  getBoardTile,
  getPlayerTiles,
  getTile,
  initializeTiles,
  tileLabel,
  updateTiles,
} from '../../domain/tileOperations.ts';
import {
  type BoardTile,
  GameError,
  GameErrorCodes,
  type Hotel,
  type HOTEL_NAME,
  type HOTEL_TYPE,
  type Tile,
} from '@/types/index.ts';
import { CHARACTER_CODE_A, COLS, ROWS, SAFE_HOTEL_SIZE } from '../../../shared/types/gameConfig.ts';

// Helper function to create a tile
function createTile(
  row: number,
  col: number,
  location: 'board' | 'bag' | 'dead' | number = 'bag',
): Tile {
  return { row, col, location };
}

// Helper function to create a board tile
function createBoardTile(row: number, col: number, hotel?: HOTEL_NAME): BoardTile {
  const tile: BoardTile = { row, col, location: 'board' };
  if (hotel) {
    tile.hotel = hotel;
  }
  return tile;
}

// Helper function to create a hotel
function createHotel(
  name: HOTEL_NAME,
  type: HOTEL_TYPE,
): Hotel {
  const shares = Array.from({ length: 25 }, () => ({
    location: 'bank' as const,
  }));

  return {
    name,
    type,
    shares,
  };
}

// Helper function to create board tiles for a hotel
function createHotelTiles(hotelName: HOTEL_NAME, tileCount: number): BoardTile[] {
  return Array.from({ length: tileCount }, (_, i) => ({
    row: Math.floor(i / 9),
    col: i % 9,
    location: 'board' as const,
    hotel: hotelName,
  }));
}

Deno.test('initializeTiles', async (t) => {
  await t.step('creates correct number of tiles for standard board', () => {
    const tiles = initializeTiles(ROWS, COLS);
    assertEquals(tiles.length, ROWS * COLS);
  });

  await t.step('creates tiles with correct positions and initial location', () => {
    const tiles = initializeTiles(3, 3);

    // Check that all tiles are in bag initially
    tiles.forEach((tile) => {
      assertEquals(tile.location, 'bag');
    });

    // Check specific positions
    assertEquals(tiles[0], { row: 0, col: 0, location: 'bag' });
    assertEquals(tiles[1], { row: 0, col: 1, location: 'bag' });
    assertEquals(tiles[2], { row: 0, col: 2, location: 'bag' });
    assertEquals(tiles[3], { row: 1, col: 0, location: 'bag' });
    assertEquals(tiles[8], { row: 2, col: 2, location: 'bag' });
  });

  await t.step('handles edge cases', () => {
    const emptyTiles = initializeTiles(0, 0);
    assertEquals(emptyTiles.length, 0);

    const singleTile = initializeTiles(1, 1);
    assertEquals(singleTile.length, 1);
    assertEquals(singleTile[0], { row: 0, col: 0, location: 'bag' });
  });
});

Deno.test('tileLabel', async (t) => {
  await t.step('generates correct labels for various positions', () => {
    assertEquals(tileLabel(createTile(0, 0)), '1A');
    assertEquals(tileLabel(createTile(0, 1)), '1B');
    assertEquals(tileLabel(createTile(1, 0)), '2A');
    assertEquals(tileLabel(createTile(11, 8)), '12I');
    assertEquals(tileLabel(createTile(5, 3)), '6D');
  });

  await t.step('handles edge positions correctly', () => {
    assertEquals(tileLabel(createTile(0, 8)), '1I');
    assertEquals(tileLabel(createTile(11, 0)), '12A');
  });
});

Deno.test('boardTiles', async (t) => {
  await t.step('filters only board tiles', () => {
    const tiles: Tile[] = [
      createTile(0, 0, 'board'),
      createTile(0, 1, 'bag'),
      createTile(0, 2, 'board'),
      createTile(0, 3, 1), // player 1
      createTile(0, 4, 'dead'),
    ];

    const result = boardTiles(tiles);
    assertEquals(result.length, 2);
    assertEquals(result[0], { row: 0, col: 0, location: 'board' });
    assertEquals(result[1], { row: 0, col: 2, location: 'board' });
  });

  await t.step('returns empty array when no board tiles', () => {
    const tiles: Tile[] = [
      createTile(0, 0, 'bag'),
      createTile(0, 1, 1),
      createTile(0, 2, 'dead'),
    ];

    const result = boardTiles(tiles);
    assertEquals(result.length, 0);
  });

  await t.step('handles empty input', () => {
    const result = boardTiles([]);
    assertEquals(result.length, 0);
  });
});

Deno.test('deadTile', async (t) => {
  await t.step('throws error when checking board tile', () => {
    const boardTile = createTile(0, 0, 'board');
    const tiles: BoardTile[] = [];

    const error = assertThrows(
      () => deadTile(boardTile, tiles),
      GameError,
      'invalid check for dead tile 1A',
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('returns false when no adjacent safe hotels', () => {
    const tile = createTile(5, 5, 'bag');
    const boardTiles: BoardTile[] = [
      createBoardTile(4, 5), // adjacent but no hotel
      createBoardTile(6, 5), // adjacent but no hotel
    ];

    const result = deadTile(tile, boardTiles);
    assertEquals(result, false);
  });

  await t.step('returns false when only one adjacent safe hotel', () => {
    const tile = createTile(5, 5, 'bag');
    // Create enough tiles to make Worldwide hotel safe (>= SAFE_HOTEL_SIZE)
    const worldwideTiles = createHotelTiles('Worldwide', SAFE_HOTEL_SIZE);
    const boardTiles: BoardTile[] = [
      ...worldwideTiles,
      createBoardTile(4, 5, 'Worldwide'), // adjacent safe hotel
      createBoardTile(6, 5), // adjacent but no hotel
    ];

    const result = deadTile(tile, boardTiles);
    assertEquals(result, false);
  });

  await t.step('returns true when two or more adjacent safe hotels', () => {
    const tile = createTile(5, 5, 'bag');
    // Create enough tiles to make both hotels safe
    const worldwideTiles = createHotelTiles('Worldwide', SAFE_HOTEL_SIZE);
    const sacksonTiles = createHotelTiles('Sackson', SAFE_HOTEL_SIZE);
    const boardTiles: BoardTile[] = [
      ...worldwideTiles,
      ...sacksonTiles,
      createBoardTile(4, 5, 'Worldwide'), // adjacent safe hotel
      createBoardTile(6, 5, 'Sackson'), // adjacent safe hotel
    ];

    const result = deadTile(tile, boardTiles);
    assertEquals(result, true);
  });

  await t.step('returns false when adjacent hotels are not safe', () => {
    const tile = createTile(5, 5, 'bag');
    // Create small hotels (less than SAFE_HOTEL_SIZE)
    const worldwideTiles = createHotelTiles('Worldwide', 5);
    const sacksonTiles = createHotelTiles('Sackson', 3);
    const boardTiles: BoardTile[] = [
      ...worldwideTiles,
      ...sacksonTiles,
      createBoardTile(4, 5, 'Worldwide'), // adjacent but not safe
      createBoardTile(6, 5, 'Sackson'), // adjacent but not safe
    ];

    const result = deadTile(tile, boardTiles);
    assertEquals(result, false);
  });

  await t.step('handles edge positions correctly', () => {
    const cornerTile = createTile(0, 0, 'bag');
    // Create enough tiles to make both hotels safe
    const worldwideTiles = createHotelTiles('Worldwide', SAFE_HOTEL_SIZE);
    const sacksonTiles = createHotelTiles('Sackson', SAFE_HOTEL_SIZE);
    const boardTiles: BoardTile[] = [
      ...worldwideTiles,
      ...sacksonTiles,
      createBoardTile(0, 1, 'Worldwide'), // adjacent safe hotel
      createBoardTile(1, 0, 'Sackson'), // adjacent safe hotel
    ];

    const result = deadTile(cornerTile, boardTiles);
    assertEquals(result, true);
  });
});

Deno.test('updateTiles', async (t) => {
  await t.step('updates existing tiles correctly', () => {
    const currentTiles: Tile[] = [
      createTile(0, 0, 'bag'),
      createTile(0, 1, 'bag'),
      createTile(0, 2, 'bag'),
    ];

    const tilesToUpdate: Tile[] = [
      createTile(0, 0, 'board'),
      createTile(0, 2, 1), // player 1
    ];

    const result = updateTiles(currentTiles, tilesToUpdate);

    assertEquals(result.length, 3);
    assertEquals(result[0], { row: 0, col: 0, location: 'board' });
    assertEquals(result[1], { row: 0, col: 1, location: 'bag' }); // unchanged
    assertEquals(result[2], { row: 0, col: 2, location: 1 });
  });

  await t.step('ignores tiles that do not exist in current tiles', () => {
    const currentTiles: Tile[] = [
      createTile(0, 0, 'bag'),
      createTile(0, 1, 'bag'),
    ];

    const tilesToUpdate: Tile[] = [
      createTile(0, 0, 'board'),
      createTile(5, 5, 'board'), // doesn't exist in current
    ];

    const result = updateTiles(currentTiles, tilesToUpdate);

    assertEquals(result.length, 2);
    assertEquals(result[0], { row: 0, col: 0, location: 'board' });
    assertEquals(result[1], { row: 0, col: 1, location: 'bag' });
  });

  await t.step('does not mutate original arrays', () => {
    const currentTiles: Tile[] = [
      createTile(0, 0, 'bag'),
      createTile(0, 1, 'bag'),
    ];

    const tilesToUpdate: Tile[] = [
      createTile(0, 0, 'board'),
    ];

    const originalCurrentTiles = [...currentTiles];
    const originalTilesToUpdate = [...tilesToUpdate];

    const result = updateTiles(currentTiles, tilesToUpdate);

    // Original arrays should be unchanged
    assertEquals(currentTiles, originalCurrentTiles);
    assertEquals(tilesToUpdate, originalTilesToUpdate);

    // Result should be different from original
    assertEquals(result !== currentTiles, true);
  });

  await t.step('handles empty updates', () => {
    const currentTiles: Tile[] = [
      createTile(0, 0, 'bag'),
      createTile(0, 1, 'bag'),
    ];

    const result = updateTiles(currentTiles, []);

    assertEquals(result.length, 2);
    assertEquals(result[0], currentTiles[0]);
    assertEquals(result[1], currentTiles[1]);
  });
});

Deno.test('getBoardTile', async (t) => {
  await t.step('finds tile at specified position', () => {
    const tiles: BoardTile[] = [
      createBoardTile(0, 0),
      createBoardTile(0, 1),
      createBoardTile(1, 0),
    ];

    const result = getBoardTile(tiles, 0, 1);
    assertEquals(result, tiles[1]);
  });

  await t.step('returns undefined when tile not found', () => {
    const tiles: BoardTile[] = [
      createBoardTile(0, 0),
      createBoardTile(0, 1),
    ];

    const result = getBoardTile(tiles, 5, 5);
    assertEquals(result, undefined);
  });

  await t.step('handles empty array', () => {
    const result = getBoardTile([], 0, 0);
    assertEquals(result, undefined);
  });
});

Deno.test('getTile', async (t) => {
  await t.step('finds tile at specified position', () => {
    const tiles: Tile[] = [
      createTile(0, 0, 'bag'),
      createTile(0, 1, 'board'),
      createTile(1, 0, 1),
    ];

    const result = getTile(tiles, 0, 1);
    assertEquals(result, tiles[1]);
  });

  await t.step('returns undefined when tile not found', () => {
    const tiles: Tile[] = [
      createTile(0, 0, 'bag'),
      createTile(0, 1, 'board'),
    ];

    const result = getTile(tiles, 5, 5);
    assertEquals(result, undefined);
  });

  await t.step('handles empty array', () => {
    const result = getTile([], 0, 0);
    assertEquals(result, undefined);
  });
});

Deno.test('getPlayerTiles', async (t) => {
  await t.step('returns tiles for specified player', () => {
    const tiles: Tile[] = [
      createTile(0, 0, 1), // player 1
      createTile(0, 1, 2), // player 2
      createTile(0, 2, 1), // player 1
      createTile(1, 0, 'bag'),
      createTile(1, 1, 1), // player 1
      createTile(1, 2, 3), // player 3
    ];

    const result = getPlayerTiles(1, tiles);
    assertEquals(result.length, 3);
    assertEquals(result[0], { row: 0, col: 0, location: 1 });
    assertEquals(result[1], { row: 0, col: 2, location: 1 });
    assertEquals(result[2], { row: 1, col: 1, location: 1 });
  });

  await t.step('returns empty array when player has no tiles', () => {
    const tiles: Tile[] = [
      createTile(0, 0, 2), // player 2
      createTile(0, 1, 3), // player 3
    ];

    const result = getPlayerTiles(1, tiles);
    assertEquals(result.length, 0);
  });

  await t.step('handles empty input', () => {
    const result = getPlayerTiles(1, []);
    assertEquals(result.length, 0);
  });
});

Deno.test('drawTiles', async (t) => {
  await t.step('draws requested number of tiles when available', () => {
    const availableTiles: Tile[] = [
      createTile(0, 0, 'bag'),
      createTile(0, 1, 'bag'),
      createTile(0, 2, 'bag'),
      createTile(0, 3, 'bag'),
    ];
    const boardTiles: BoardTile[] = [];
    const playerId = 1;
    const count = 3;

    const result = drawTiles(availableTiles, playerId, boardTiles, count);

    assertEquals(result.drawnTiles.length, 3);
    assertEquals(result.deadTiles.length, 0);
    assertEquals(result.remainingTiles.length, 1);

    // Check that drawn tiles have correct player location
    result.drawnTiles.forEach((tile) => {
      assertEquals(tile.location, playerId);
    });
  });

  await t.step('handles dead tiles correctly', () => {
    const availableTiles: Tile[] = [
      createTile(5, 5, 'bag'), // This will be dead due to adjacent safe hotels
      createTile(0, 9, 'bag'),
      createTile(1, 9, 'bag'),
    ];

    // Create enough tiles to make both hotels safe
    const worldwideTiles = createHotelTiles('Worldwide', SAFE_HOTEL_SIZE);
    const sacksonTiles = createHotelTiles('Sackson', SAFE_HOTEL_SIZE);
    const boardTiles: BoardTile[] = [
      ...worldwideTiles,
      ...sacksonTiles,
      createBoardTile(4, 5, 'Worldwide'), // adjacent safe hotel
      createBoardTile(6, 5, 'Sackson'), // adjacent safe hotel
    ];

    const playerId = 1;
    const count = 3;

    const result = drawTiles(availableTiles, playerId, boardTiles, count);

    assertEquals(result.drawnTiles.length, 2);
    assertEquals(result.deadTiles.length, 1);
    assertEquals(result.deadTiles[0].location, 'dead');
    assertEquals(result.deadTiles[0].row, 5);
    assertEquals(result.deadTiles[0].col, 5);
  });

  await t.step('stops when no more tiles available', () => {
    const availableTiles: Tile[] = [
      createTile(0, 0, 'bag'),
      createTile(0, 1, 'bag'),
    ];
    const boardTiles: BoardTile[] = [];
    const playerId = 1;
    const count = 5; // More than available

    const result = drawTiles(availableTiles, playerId, boardTiles, count);

    assertEquals(result.drawnTiles.length, 2);
    assertEquals(result.deadTiles.length, 0);
    assertEquals(result.remainingTiles.length, 0);
  });

  await t.step('continues drawing when encountering dead tiles', () => {
    const availableTiles: Tile[] = [
      createTile(5, 5, 'bag'), // dead tile
      createTile(6, 6, 'bag'), // dead tile
      createTile(0, 9, 'bag'), // good tile
      createTile(0, 9, 'bag'), // good tile
      createTile(0, 9, 'bag'), // good tile
    ];

    // Create enough tiles to make both hotels safe
    const worldwideTiles = createHotelTiles('Worldwide', SAFE_HOTEL_SIZE);
    const sacksonTiles = createHotelTiles('Sackson', SAFE_HOTEL_SIZE);
    const boardTiles: BoardTile[] = [
      ...worldwideTiles,
      ...sacksonTiles,
      createBoardTile(4, 5, 'Worldwide'), // makes (5,5) dead
      createBoardTile(6, 5, 'Sackson'),
      createBoardTile(5, 6, 'Worldwide'), // makes (6,6) dead
      createBoardTile(7, 6, 'Sackson'),
    ];

    const playerId = 1;
    const count = 5;

    const result = drawTiles(availableTiles, playerId, boardTiles, count);

    assertEquals(result.drawnTiles.length, 3);
    assertEquals(result.deadTiles.length, 2);
    assertEquals(result.remainingTiles.length, 0);

    // Check that all drawn tiles belong to player
    result.drawnTiles.forEach((tile) => {
      assertEquals(tile.location, playerId);
    });

    // Check that dead tiles are marked as dead
    result.deadTiles.forEach((tile) => {
      assertEquals(tile.location, 'dead');
    });
  });

  await t.step('handles case where all remaining tiles are dead', () => {
    const availableTiles: Tile[] = [
      createTile(5, 5, 'bag'), // dead tile
      createTile(6, 6, 'bag'), // dead tile
    ];

    // Create enough tiles to make both hotels safe
    const worldwideTiles = createHotelTiles('Worldwide', SAFE_HOTEL_SIZE);
    const sacksonTiles = createHotelTiles('Sackson', SAFE_HOTEL_SIZE);
    const boardTiles: BoardTile[] = [
      ...worldwideTiles,
      ...sacksonTiles,
      createBoardTile(4, 5, 'Worldwide'),
      createBoardTile(6, 5, 'Sackson'),
      createBoardTile(5, 6, 'Worldwide'),
      createBoardTile(7, 6, 'Sackson'),
    ];

    const playerId = 1;
    const count = 3;
    const result = drawTiles(availableTiles, playerId, boardTiles, count);

    assertEquals(result.drawnTiles.length, 0);
    assertEquals(result.deadTiles.length, 2);
    assertEquals(result.remainingTiles.length, 0);
  });

  await t.step('does not mutate original available tiles array', () => {
    const availableTiles: Tile[] = [
      createTile(0, 0, 'bag'),
      createTile(0, 1, 'bag'),
    ];
    const originalTiles = [...availableTiles];
    const boardTiles: BoardTile[] = [];
    const playerId = 1;
    const count = 1;

    drawTiles(availableTiles, playerId, boardTiles, count);

    assertEquals(availableTiles, originalTiles);
  });

  await t.step('handles empty available tiles', () => {
    const result = drawTiles([], 1, [], 3);

    assertEquals(result.drawnTiles.length, 0);
    assertEquals(result.deadTiles.length, 0);
    assertEquals(result.remainingTiles.length, 0);
  });
});
