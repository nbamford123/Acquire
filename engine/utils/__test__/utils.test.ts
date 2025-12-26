import { assertEquals, assertNotEquals, assertThrows } from '@std/assert';
import type { Tile } from '../../types/tile.ts';
import type { GameState, Hotel, Player, Share } from '../../types/index.ts';
import { GamePhase } from '../../types/gameState.ts';
import { GameError, GameErrorCodes } from '../../types/index.ts';

import {
  cmpTiles,
  filterDefined,
  getAdjacentPositions,
  getHotelPrice,
  getPlayerView,
  getStockholderMap,
  getTileLabel,
  roundUpToNearestHundred,
  shuffleTiles,
  sortTiles,
} from '../index.ts';

// Test data helpers
const createTile = (
  row: number,
  col: number,
  location: 'board' | 'bag' | 'dead' | number = 'board',
): Tile => ({
  row,
  col,
  location,
});

// getHotelPrice tests (use real hotel config from types)
Deno.test('getHotelPrice - returns correct price object for bracket', () => {
  // Using an actual hotel name from HOTEL_NAMES (Luxor -> economy)
  const result2 = getHotelPrice('Luxor', 2);
  // result should be the price object for bracket 2
  assertEquals(result2, { price: 200, majority: 2000, minority: 1000 });

  const result4 = getHotelPrice('Luxor', 4);
  assertEquals(result4, { price: 400, majority: 4000, minority: 2000 });

  const resultLarge = getHotelPrice('Luxor', Number.MAX_SAFE_INTEGER);
  // largest bracket returns the last defined entry
  assertEquals(resultLarge, { price: 1000, majority: 10000, minority: 5000 });
});

Deno.test('getHotelPrice - handles standard and luxury hotel types', () => {
  // Festival is standard
  const fest2 = getHotelPrice('Festival', 2);
  assertEquals(fest2, { price: 300, majority: 3000, minority: 1500 });

  const fest5 = getHotelPrice('Festival', 5);
  assertEquals(fest5, { price: 600, majority: 6000, minority: 3000 });

  const festMax = getHotelPrice('Festival', Number.MAX_SAFE_INTEGER);
  assertEquals(festMax, { price: 1100, majority: 11000, minority: 5500 });

  // Continental is luxury
  const cont2 = getHotelPrice('Continental', 2);
  assertEquals(cont2, { price: 400, majority: 4000, minority: 2000 });

  const cont40 = getHotelPrice('Continental', 40);
  assertEquals(cont40, { price: 1100, majority: 11000, minority: 5500 });

  const contMax = getHotelPrice('Continental', Number.MAX_SAFE_INTEGER);
  assertEquals(contMax, { price: 1200, majority: 12000, minority: 6000 });
});

Deno.test('getHotelPrice - returns 0 when provided prices map has no matching brackets', () => {
  // Pass an empty prices map to exercise the fallback branch
  const result = getHotelPrice('Worldwide', 2, {} as any);
  assertEquals(result.price, 0);
});

Deno.test('getHotelPrice - works with Map input and respects numeric ordering', () => {
  const prices = new Map<number, { price: number; majority: number; minority: number }>([
    [5, { price: 500, majority: 5000, minority: 2500 }],
    [2, { price: 200, majority: 2000, minority: 1000 }],
  ]);

  // size=3 should not match bracket 2, but should match bracket 5
  const result = getHotelPrice('Worldwide', 3, prices);
  assertEquals(result, { price: 500, majority: 5000, minority: 2500 });
});

Deno.test('getHotelPrice - works with Map input when size is small', () => {
  const prices = new Map<number, { price: number; majority: number; minority: number }>([
    [3, { price: 300, majority: 3000, minority: 1500 }],
    [10, { price: 600, majority: 6000, minority: 3000 }],
  ]);

  // size=2 should match first bracket (3)
  const result = getHotelPrice('Festival', 2, prices);
  assertEquals(result, { price: 300, majority: 3000, minority: 1500 });
});

Deno.test('getHotelPrice - returns 0 for empty Map input', () => {
  const prices = new Map<number, { price: number; majority: number; minority: number }>();
  const result = getHotelPrice('Continental', 1, prices);
  assertEquals(result.price, 0);
});

// getStockholderMap tests
Deno.test('getStockholderMap - sorts and maps stockholder map', () => {
  const map = new Map<number, number>([[2, 5], [1, 10], [3, 7]]);
  const result = getStockholderMap(map);
  assertEquals(result, [
    { playerId: 1, stockCount: 10 },
    { playerId: 3, stockCount: 7 },
    { playerId: 2, stockCount: 5 },
  ]);
});

// getTileLabel tests
Deno.test('getTileLabel - returns correct label for tile', () => {
  // Mock CHARACTER_CODE_A
  // @ts-ignore: Injecting CHARACTER_CODE_A for test
  globalThis.CHARACTER_CODE_A = 65;
  // @ts-ignore: Using injected CHARACTER_CODE_A for test
  assertEquals(getTileLabel({ row: 0, col: 0 }), '1A');
  // @ts-ignore: Using injected CHARACTER_CODE_A for test
  assertEquals(getTileLabel({ row: 2, col: 3 }), '4C');
});

// roundUpToNearestHundred tests
Deno.test('roundUpToNearestHundred - rounds up correctly', () => {
  assertEquals(roundUpToNearestHundred(50), 100);
  assertEquals(roundUpToNearestHundred(100), 100);
  assertEquals(roundUpToNearestHundred(101), 200);
  assertEquals(roundUpToNearestHundred(0), 0);
});

// cmpTiles tests
Deno.test('cmpTiles - sorts correctly when columns differ', () => {
  assertEquals(
    cmpTiles(
      createTile(0, 0),
      createTile(0, 1),
    ),
    -1,
  );
  assertEquals(
    cmpTiles(
      createTile(0, 12),
      createTile(0, 10),
    ),
    1,
  );
});

Deno.test('cmpTiles - sorts correctly when columns are the same, but rows differ', () => {
  assertEquals(
    cmpTiles(
      createTile(0, 0),
      createTile(1, 0),
    ),
    -1,
  );
  assertEquals(
    cmpTiles(
      createTile(7, 12),
      createTile(6, 12),
    ),
    1,
  );
});

Deno.test('cmpTiles - returns 0 when tiles are identical', () => {
  assertEquals(
    cmpTiles(
      createTile(5, 3),
      createTile(5, 3),
    ),
    0,
  );
});

Deno.test('cmpTiles - handles edge cases with different locations', () => {
  assertEquals(
    cmpTiles(
      createTile(0, 0, 'bag'),
      createTile(0, 1, 'board'),
    ),
    -1,
  );
  assertEquals(
    cmpTiles(
      createTile(5, 3, 1),
      createTile(5, 3, 2),
    ),
    0,
  );
});

// fiterDefinedTests
Deno.test('filterDefined - removes undefined and null values', () => {
  assertEquals(filterDefined([1, null, 2, undefined, 3]), [1, 2, 3]);
});

Deno.test('filterDefined - returns empty array with array input', () => {
  assertEquals(filterDefined([]), []);
});

// getAdjacentPositions tests
Deno.test('getAdjacentPositions - returns correct adjacent positions for center tile', () => {
  const adjacent = getAdjacentPositions(5, 4);
  assertEquals(adjacent.length, 4);
  assertEquals(adjacent, [[4, 4], [6, 4], [5, 3], [5, 5]]);
});

Deno.test('getAdjacentPositions - handles top-left corner', () => {
  const adjacent = getAdjacentPositions(0, 0);
  assertEquals(adjacent.length, 2);
  assertEquals(adjacent, [[1, 0], [0, 1]]);
});

Deno.test('getAdjacentPositions - handles top-right corner', () => {
  const adjacent = getAdjacentPositions(0, 11);
  assertEquals(adjacent.length, 2);
  assertEquals(adjacent, [[1, 11], [0, 10]]);
});

Deno.test('getAdjacentPositions - handles bottom-left corner', () => {
  const adjacent = getAdjacentPositions(8, 0);
  assertEquals(adjacent.length, 2);
  assertEquals(adjacent, [[7, 0], [8, 1]]);
});

Deno.test('getAdjacentPositions - handles bottom-right corner', () => {
  const adjacent = getAdjacentPositions(8, 11);
  assertEquals(adjacent.length, 2);
  assertEquals(adjacent, [[7, 11], [8, 10]]);
});

Deno.test('getAdjacentPositions - handles top edge', () => {
  const adjacent = getAdjacentPositions(0, 4);
  assertEquals(adjacent.length, 3);
  assertEquals(adjacent, [[1, 4], [0, 3], [0, 5]]);
});

Deno.test('getAdjacentPositions - handles bottom edge', () => {
  const adjacent = getAdjacentPositions(8, 4);
  assertEquals(adjacent.length, 3);
  assertEquals(adjacent, [[7, 4], [8, 3], [8, 5]]);
});

Deno.test('getAdjacentPositions - handles left edge', () => {
  const adjacent = getAdjacentPositions(5, 0);
  assertEquals(adjacent.length, 3);
  assertEquals(adjacent, [[4, 0], [6, 0], [5, 1]]);
});

Deno.test('getAdjacentPositions - handles right edge', () => {
  const adjacent = getAdjacentPositions(5, 11);
  assertEquals(adjacent.length, 3);
  assertEquals(adjacent, [[4, 11], [6, 11], [5, 10]]);
});

// shuffleTiles tests
Deno.test('shuffleTiles - returns array of same length', () => {
  const tiles = [
    createTile(0, 0),
    createTile(0, 1),
    createTile(1, 0),
    createTile(1, 1),
  ];
  const shuffled = shuffleTiles(tiles);
  assertEquals(shuffled.length, tiles.length);
});

Deno.test('shuffleTiles - does not modify original array', () => {
  const tiles = [
    createTile(0, 0),
    createTile(0, 1),
    createTile(1, 0),
  ];
  const original = [...tiles];
  shuffleTiles(tiles);
  assertEquals(tiles, original);
});

Deno.test('shuffleTiles - contains all original elements', () => {
  const tiles = [
    createTile(0, 0),
    createTile(0, 1),
    createTile(1, 0),
    createTile(1, 1),
    createTile(2, 2),
  ];
  const shuffled = shuffleTiles(tiles);

  // Check that all original tiles are present
  for (const tile of tiles) {
    const found = shuffled.find((t) =>
      t.row === tile.row &&
      t.col === tile.col &&
      t.location === tile.location
    );
    assertEquals(found !== undefined, true);
  }
});

Deno.test('shuffleTiles - handles empty array', () => {
  const tiles: Tile[] = [];
  const shuffled = shuffleTiles(tiles);
  assertEquals(shuffled.length, 0);
});

Deno.test('shuffleTiles - handles single element array', () => {
  const tiles = [createTile(0, 0)];
  const shuffled = shuffleTiles(tiles);
  assertEquals(shuffled.length, 1);
  assertEquals(shuffled[0], tiles[0]);
});

// Note: Testing true randomness is difficult, but we can test that the function
// can produce different results (though this test might occasionally fail due to randomness)
Deno.test('shuffleTiles - can produce different arrangements', () => {
  const tiles = [
    createTile(0, 0),
    createTile(0, 1),
    createTile(1, 0),
    createTile(1, 1),
    createTile(2, 0),
    createTile(2, 1),
    createTile(3, 0),
    createTile(3, 1),
  ];

  // Run shuffle multiple times to increase chance of different arrangement
  let foundDifferentArrangement = false;
  for (let i = 0; i < 10; i++) {
    const shuffled = shuffleTiles(tiles);
    let isDifferent = false;
    for (let j = 0; j < tiles.length; j++) {
      if (tiles[j].row !== shuffled[j].row || tiles[j].col !== shuffled[j].col) {
        isDifferent = true;
        break;
      }
    }
    if (isDifferent) {
      foundDifferentArrangement = true;
      break;
    }
  }
  // This test might occasionally fail due to randomness, but it's very unlikely
  assertEquals(foundDifferentArrangement, true);
});

// sortTiles tests
Deno.test('sortTiles - sorts by column first, then by row', () => {
  const tiles = [
    createTile(2, 1),
    createTile(1, 2),
    createTile(1, 1),
    createTile(2, 2),
  ];
  const sorted = sortTiles(tiles);
  assertEquals(sorted, [
    createTile(1, 1),
    createTile(2, 1),
    createTile(1, 2),
    createTile(2, 2),
  ]);
});

// PlayerView test data helpers
const createPlayer = (id: number, name: string, money: number): Player => ({
  id,
  name,
  money,
});

const createShare = (location: number | 'bank'): Share => ({
  location,
});

const createHotel = (
  name: 'Worldwide' | 'Luxor' | 'Festival' | 'Imperial' | 'American' | 'Continental' | 'Tower',
  type: 'economy' | 'standard' | 'luxury',
  shares: Share[],
): Hotel => ({
  name,
  shares,
});

const createGameState = (overrides: Partial<GameState> = {}): GameState => ({
  gameId: 'test-game-123',
  owner: 'player1',
  currentPhase: GamePhase.PLAY_TILE,
  currentTurn: 1,
  currentPlayer: 0,
  lastUpdated: Date.now(),
  players: [
    createPlayer(0, 'player1', 6000),
    createPlayer(1, 'player2', 6000),
  ],
  hotels: [
    createHotel('Worldwide', 'economy', [
      createShare(0), // player1 has 1 share
      createShare('bank'),
      createShare('bank'),
    ]),
    createHotel('Luxor', 'standard', [
      createShare(0), // player1 has 2 shares
      createShare(0),
      createShare(1), // player2 has 1 share
      createShare('bank'),
    ]),
  ],
  tiles: [
    createTile(0, 0, 0), // player1's tile
    createTile(0, 1, 1), // player2's tile
    createTile(1, 0, 'board'), // board tile
  ],
  error: null,
  ...overrides,
});

// getPlayerView tests
Deno.test('getPlayerView - returns correct player view for valid player', () => {
  const gameState = createGameState();
  const playerView = getPlayerView('player1', gameState);

  assertEquals(playerView.gameId, 'test-game-123');
  assertEquals(playerView.owner, 'player1');
  assertEquals(playerView.playerId, 0);
  assertEquals(playerView.money, 6000);
  assertEquals(playerView.currentPhase, GamePhase.PLAY_TILE);
  assertEquals(playerView.currentTurn, 1);
  assertEquals(playerView.currentPlayer, 0);
  assertEquals(playerView.lastUpdated, gameState.lastUpdated);
  assertEquals(playerView.error, null);
});

Deno.test('getPlayerView - returns correct stocks for player', () => {
  const gameState = createGameState();
  const playerView = getPlayerView('player1', gameState);

  assertEquals(playerView.stocks.Worldwide, 1);
  assertEquals(playerView.stocks.Luxor, 2);
  assertEquals(Object.keys(playerView.stocks).length, 2);
});

Deno.test('getPlayerView - returns correct tiles for player', () => {
  const gameState = createGameState();
  const playerView = getPlayerView('player1', gameState);

  assertEquals(playerView.tiles, [
    { row: 0, col: 0 },
  ]);
});

Deno.test('getPlayerView - returns correct other players info with OrcCount', () => {
  const gameState = createGameState({
    players: [
      createPlayer(0, 'player1', 6000),
      createPlayer(1, 'player2', 2), // '2' OrcCount
      createPlayer(2, 'player3', 1), // '1' OrcCount
      createPlayer(3, 'player4', 3), // 'many' OrcCount (>= 3)
    ],
  });
  const playerView = getPlayerView('player1', gameState);

  assertEquals(playerView.players.length, 4);
  assertEquals(playerView.players[0].name, 'player1');
  assertEquals(playerView.players[0].money, 'many');
  assertEquals(playerView.players[1].name, 'player2');
  assertEquals(playerView.players[1].money, '2');
  assertEquals(playerView.players[2].name, 'player3');
  assertEquals(playerView.players[2].money, '1');
  assertEquals(playerView.players[3].name, 'player4');
  assertEquals(playerView.players[3].money, 'many');
});

Deno.test('getPlayerView - returns correct other players shares with OrcCount', () => {
  const gameState = createGameState({
    hotels: [
      createHotel('Worldwide', 'economy', [
        createShare(0), // player1 has 1 share
        createShare(1), // player2 has 1 share
        createShare(1), // player2 has 2 shares total
        createShare(1), // player2 has 3+ shares total (many)
        createShare('bank'),
      ]),
    ],
  });
  const playerView = getPlayerView('player1', gameState);

  assertEquals(playerView.players[1].shares.Worldwide, 'many');
  assertEquals(Object.keys(playerView.players[1].shares).length, 1);
});

Deno.test('getPlayerView - returns correct hotel shares available in bank', () => {
  const gameState = createGameState();
  const playerView = getPlayerView('player1', gameState);

  // The hotels mapping counts only bank shares
  assertEquals(playerView.hotels['Worldwide'].shares, 2);
  assertEquals(playerView.hotels['Luxor'].shares, 1);
});

Deno.test('getPlayerView - includes board tiles', () => {
  const gameState = createGameState();
  const playerView = getPlayerView('player1', gameState);

  // The board should be generated from boardTiles function
  assertEquals(Array.isArray(playerView.board), true);
});

Deno.test('getPlayerView - includes optional context fields when present', () => {
  const gameState = createGameState({
    mergerTieContext: {
      tiedHotels: ['Worldwide', 'Luxor'],
    },
    mergeContext: {
      originalHotels: ['Worldwide', 'Luxor'],
      additionalTiles: [{ row: 2, col: 2, location: 'board' as const }],
      survivingHotel: 'Worldwide',
      mergedHotel: 'Luxor',
    },
    foundHotelContext: {
      availableHotels: ['Festival', 'Imperial'],
      tiles: [{ row: 2, col: 2 }],
    },
    pendingMergePlayer: 1,
  });
  const playerView = getPlayerView('player1', gameState);

  assertEquals(playerView.mergerTieContext, {
    tiedHotels: ['Worldwide', 'Luxor'],
  });
  assertEquals(playerView.mergeContext?.originalHotels, ['Worldwide', 'Luxor']);
  assertEquals(playerView.mergeContext?.survivingHotel, 'Worldwide');
  assertEquals(playerView.mergeContext?.mergedHotel, 'Luxor');
  assertEquals(playerView.foundHotelContext, {
    availableHotels: ['Festival', 'Imperial'],
    tiles: [{ row: 2, col: 2 }],
  });
  assertEquals(playerView.pendingMergePlayer, 1);
});

Deno.test('getPlayerView - includes error when present', () => {
  const gameState = createGameState({
    error: {
      code: GameErrorCodes.GAME_INVALID_ACTION,
      message: 'Invalid move',
    },
  });
  const playerView = getPlayerView('player1', gameState);

  assertEquals(playerView.error, {
    code: GameErrorCodes.GAME_INVALID_ACTION,
    message: 'Invalid move',
  });
});

Deno.test('getPlayerView - throws error for non-existent player', () => {
  const gameState = createGameState();

  assertThrows(
    () => getPlayerView('nonexistent', gameState),
    GameError,
    "Player nonexistent doesn't exist in game",
  );
});

Deno.test('getPlayerView - handles player with no shares', () => {
  const gameState = createGameState({
    hotels: [
      createHotel('Worldwide', 'economy', [
        createShare('bank'),
        createShare('bank'),
      ]),
    ],
  });
  const playerView = getPlayerView('player1', gameState);

  assertEquals(Object.keys(playerView.stocks).length, 0);
});

Deno.test('getPlayerView - handles player with no tiles', () => {
  const gameState = createGameState({
    tiles: [
      createTile(0, 0, 'board'),
      createTile(0, 1, 1), // only player2 has tiles
    ],
  });
  const playerView = getPlayerView('player1', gameState);

  assertEquals(playerView.tiles, []);
});

Deno.test('getPlayerView - handles single player game', () => {
  const gameState = createGameState({
    players: [
      createPlayer(0, 'player1', 6000),
    ],
  });
  const playerView = getPlayerView('player1', gameState);

  assertEquals(playerView.players[0].name, 'player1');
});

Deno.test('getPlayerView - handles different money amounts for OrcCount conversion', () => {
  const gameState = createGameState({
    players: [
      createPlayer(0, 'player1', 6000),
      createPlayer(1, 'player2', 0), // '0' OrcCount
      createPlayer(2, 'player3', 1), // '1' OrcCount
      createPlayer(3, 'player4', 2), // '2' OrcCount
      createPlayer(4, 'player5', 3), // 'many' OrcCount (>= 3)
    ],
  });
  const playerView = getPlayerView('player1', gameState);

  assertEquals(playerView.players[0].money, 'many');
  assertEquals(playerView.players[1].money, '0');
  assertEquals(playerView.players[2].money, '1');
  assertEquals(playerView.players[3].money, '2');
  assertEquals(playerView.players[4].money, 'many');
});

Deno.test('getPlayerView - handles different share amounts for OrcCount conversion', () => {
  const gameState = createGameState({
    hotels: [
      createHotel('Worldwide', 'economy', [
        createShare(0), // player1 has 1 share
        // player2 (id=1) has 0 shares - no shares for them
        createShare(2), // player3 has 1 share
        createShare(3), // player4 has 2 shares
        createShare(3),
        createShare(4), // player5 has 3+ shares
        createShare(4),
        createShare(4),
        createShare('bank'),
      ]),
    ],
    players: [
      createPlayer(0, 'player1', 6000),
      createPlayer(1, 'player2', 6000),
      createPlayer(2, 'player3', 6000),
      createPlayer(3, 'player4', 6000),
      createPlayer(4, 'player5', 6000),
    ],
  });
  const playerView = getPlayerView('player1', gameState);

  // player2 should not appear in shares since they have 0
  assertEquals(Object.keys(playerView.players[0].shares).length, 1); // player1
  assertEquals(Object.keys(playerView.players[1].shares).length, 0); // player2
  assertEquals(playerView.players[2].shares.Worldwide, '1'); // player3
  assertEquals(Object.keys(playerView.players[2].shares).length, 1);
  assertEquals(playerView.players[3].shares.Worldwide, '2'); // player4
  assertEquals(Object.keys(playerView.players[3].shares).length, 1);
  assertEquals(playerView.players[4].shares.Worldwide, 'many'); // player5
  assertEquals(Object.keys(playerView.players[4].shares).length, 1);
});

Deno.test('sortTiles - handles tiles with same column, different rows', () => {
  const tiles = [
    createTile(3, 1),
    createTile(1, 1),
    createTile(2, 1),
  ];
  const sorted = sortTiles(tiles);
  assertEquals(sorted, [
    createTile(1, 1),
    createTile(2, 1),
    createTile(3, 1),
  ]);
});

Deno.test('sortTiles - handles tiles with different columns, same row', () => {
  const tiles = [
    createTile(1, 3),
    createTile(1, 1),
    createTile(1, 2),
  ];
  const sorted = sortTiles(tiles);
  assertEquals(sorted, [
    createTile(1, 1),
    createTile(1, 2),
    createTile(1, 3),
  ]);
});

Deno.test('sortTiles - handles already sorted array', () => {
  const tiles = [
    createTile(1, 1),
    createTile(2, 1),
    createTile(1, 2),
    createTile(2, 2),
  ];
  const sorted = sortTiles(tiles);
  assertEquals(sorted, tiles);
});

Deno.test('sortTiles - handles reverse sorted array', () => {
  const tiles = [
    createTile(2, 2),
    createTile(1, 2),
    createTile(2, 1),
    createTile(1, 1),
  ];
  const sorted = sortTiles(tiles);
  assertEquals(sorted, [
    createTile(1, 1),
    createTile(2, 1),
    createTile(1, 2),
    createTile(2, 2),
  ]);
});

Deno.test('sortTiles - handles empty array', () => {
  const tiles: Tile[] = [];
  const sorted = sortTiles(tiles);
  assertEquals(sorted.length, 0);
});

Deno.test('sortTiles - handles single element array', () => {
  const tiles = [createTile(5, 3)];
  const sorted = sortTiles(tiles);
  assertEquals(sorted.length, 1);
  assertEquals(sorted[0], tiles[0]);
});

Deno.test('sortTiles - handles identical tiles', () => {
  const tiles = [
    createTile(1, 1),
    createTile(1, 1),
    createTile(1, 1),
  ];
  const sorted = sortTiles(tiles);
  assertEquals(sorted.length, 3);
  assertEquals(sorted, tiles);
});

Deno.test('sortTiles - modifies original array (in-place sort)', () => {
  const tiles = [
    createTile(2, 1),
    createTile(1, 2),
    createTile(1, 1),
  ];
  const originalReference = tiles;
  const sorted = sortTiles(tiles);

  // sortTiles should return the same reference (in-place sort)
  assertEquals(sorted === originalReference, true);
  assertEquals(tiles, [
    createTile(1, 1),
    createTile(2, 1),
    createTile(1, 2),
  ]);
});

Deno.test('sortTiles - handles tiles with different locations', () => {
  const tiles = [
    createTile(1, 2, 'bag'),
    createTile(1, 1, 'board'),
    createTile(1, 1, 1),
    createTile(1, 2, 'dead'),
  ];
  const sorted = sortTiles(tiles);
  assertEquals(sorted, [
    createTile(1, 1, 'board'),
    createTile(1, 1, 1),
    createTile(1, 2, 'bag'),
    createTile(1, 2, 'dead'),
  ]);
});
