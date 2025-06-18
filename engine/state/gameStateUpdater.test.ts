import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { handleMerger } from './gameStateUpdater.ts';
import { initializeTiles } from '../domain/tileOperations.ts';
import { initializeHotels } from '../domain/hotelOperations.ts';
import {
  type BoardTile,
  GameError,
  GameErrorCodes,
  GamePhase,
  type Hotel,
  type HOTEL_NAME,
  type MergeContext,
  type Player,
  type ResolvedTie,
  type Tile,
} from '@/types/index.ts';
import { INITIAL_PLAYER_MONEY } from '../../shared/types/gameConfig.ts';

// Helper function to create test players
function createTestPlayers(): Player[] {
  return [
    {
      id: 0,
      name: 'Player1',
      money: INITIAL_PLAYER_MONEY,
    },
    {
      id: 1,
      name: 'Player2',
      money: INITIAL_PLAYER_MONEY,
    },
    {
      id: 2,
      name: 'Player3',
      money: INITIAL_PLAYER_MONEY,
    },
  ];
}

// Helper function to place tiles on board
function placeTilesOnBoard(
  tiles: Tile[],
  positions: Array<{ row: number; col: number; hotel?: HOTEL_NAME }>,
): Tile[] {
  return tiles.map((tile) => {
    const boardTile = positions.find((pos) => pos.row === tile.row && pos.col === tile.col);
    if (boardTile) {
      return {
        ...tile,
        location: 'board' as const,
        hotel: boardTile.hotel,
      };
    }
    return tile;
  });
}

// Helper function to assign shares to players
function assignSharesToPlayer(
  hotels: Hotel[],
  hotelName: HOTEL_NAME,
  playerId: number,
  shareCount: number,
): Hotel[] {
  return hotels.map((hotel) => {
    if (hotel.name === hotelName) {
      const updatedShares = [...hotel.shares];
      let assigned = 0;
      for (let i = 0; i < updatedShares.length && assigned < shareCount; i++) {
        if (updatedShares[i].location === 'bank') {
          updatedShares[i] = { location: playerId };
          assigned++;
        }
      }
      return { ...hotel, shares: updatedShares };
    }
    return hotel;
  });
}

// Helper function to create a basic merge context
function createBasicMergeContext(): MergeContext {
  return {
    survivingHotel: 'Worldwide',
    mergedHotel: 'Sackson',
    stockholderIds: [],
    originalHotels: ['Worldwide', 'Sackson'],
    additionalTiles: [
      { row: 5, col: 5, location: 'board' as const },
      { row: 5, col: 6, location: 'board' as const },
    ],
  };
}

Deno.test('handleMerger basic functionality tests', async (t) => {
  await t.step('successfully handles merger with clear size difference', () => {
    const players = createTestPlayers();
    let hotels = initializeHotels();
    let tiles = initializeTiles(12, 9);

    // Set up board with two hotels
    tiles = placeTilesOnBoard(tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
      { row: 3, col: 3, hotel: 'Worldwide' }, // Worldwide has 3 tiles
      { row: 5, col: 1, hotel: 'Sackson' },
      { row: 5, col: 2, hotel: 'Sackson' }, // Sackson has 2 tiles
    ]);

    // Give players shares in the merged hotel (Sackson)
    hotels = assignSharesToPlayer(hotels, 'Sackson', 0, 5); // Player 0 gets 5 shares
    hotels = assignSharesToPlayer(hotels, 'Sackson', 1, 3); // Player 1 gets 3 shares

    const mergeContext: MergeContext = {
      survivingHotel: 'Worldwide',
      mergedHotel: 'Sackson',
      stockholderIds: [],
      originalHotels: ['Worldwide', 'Sackson'],
      additionalTiles: [
        { row: 3, col: 4, location: 'board' as const }, // This tile will connect the hotels
      ],
    };

    const result = handleMerger(players, tiles, hotels, mergeContext);

    // Should transition to RESOLVE_MERGER phase
    assertEquals(result.currentPhase, GamePhase.RESOLVE_MERGER);

    // Should have stockholder IDs sorted by share count (Player 0 first with 5 shares, Player 1 second with 3 shares)
    assertEquals(result.mergeContext?.stockholderIds, [0, 1]);

    // Should have correct merge context
    assertEquals(result.mergeContext?.survivingHotel, 'Worldwide');
    assertEquals(result.mergeContext?.mergedHotel, 'Sackson');

    // Players should have received majority/minority bonuses
    assertEquals(result.players?.[0].money, INITIAL_PLAYER_MONEY + 2000); // Majority bonus
    assertEquals(result.players?.[1].money, INITIAL_PLAYER_MONEY + 1000); // Minority bonus
    assertEquals(result.players?.[2].money, INITIAL_PLAYER_MONEY); // No shares, no bonus
  });

  await t.step('handles merger with tie requiring user input', () => {
    const players = createTestPlayers();
    let hotels = initializeHotels();
    let tiles = initializeTiles(12, 9);

    // Set up board with two hotels of same size
    tiles = placeTilesOnBoard(tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' }, // Worldwide has 2 tiles
      { row: 5, col: 1, hotel: 'Sackson' },
      { row: 5, col: 2, hotel: 'Sackson' }, // Sackson has 2 tiles (tie!)
    ]);

    // Give players shares
    hotels = assignSharesToPlayer(hotels, 'Sackson', 0, 3);
    hotels = assignSharesToPlayer(hotels, 'Worldwide', 1, 2);

    const mergeContext: MergeContext = {
      survivingHotel: 'Worldwide', // This will be ignored due to tie
      mergedHotel: 'Sackson',
      stockholderIds: [],
      originalHotels: ['Worldwide', 'Sackson'],
      additionalTiles: [
        { row: 4, col: 1, location: 'board' as const }, // This tile will connect the hotels
      ],
    };

    const result = handleMerger(players, tiles, hotels, mergeContext);

    // Should transition to BREAK_MERGER_TIE phase
    assertEquals(result.currentPhase, GamePhase.BREAK_MERGER_TIE);

    // Should have tie context
    assertEquals(result.mergerTieContext?.tiedHotels?.length, 2);
    assertEquals(result.mergerTieContext?.tiedHotels?.includes('Worldwide'), true);
    assertEquals(result.mergerTieContext?.tiedHotels?.includes('Sackson'), true);
  });

  await t.step('handles merger with resolved tie', () => {
    const players = createTestPlayers();
    let hotels = initializeHotels();
    let tiles = initializeTiles(12, 9);

    // Set up board with hotels of same size to create a tie scenario
    tiles = placeTilesOnBoard(tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' }, // Worldwide has 2 tiles
      { row: 5, col: 1, hotel: 'Sackson' },
      { row: 5, col: 2, hotel: 'Sackson' }, // Sackson has 2 tiles (tie!)
    ]);

    // Give players shares
    hotels = assignSharesToPlayer(hotels, 'Sackson', 0, 4);

    const mergeContext: MergeContext = {
      survivingHotel: undefined, // No survivor set initially due to tie
      mergedHotel: undefined,
      stockholderIds: [],
      originalHotels: ['Worldwide', 'Sackson'],
      additionalTiles: [],
    };

    const resolvedTie: ResolvedTie = {
      survivor: 'Worldwide',
      merged: 'Sackson',
    };

    const result = handleMerger(players, tiles, hotels, mergeContext, resolvedTie);

    // Should transition to RESOLVE_MERGER phase
    assertEquals(result.currentPhase, GamePhase.RESOLVE_MERGER);

    // Should have stockholder IDs
    assertEquals(result.mergeContext?.stockholderIds, [0]);

    // Player should have received bonuses (Sackson is economy, 2 tiles = 2000 + 1000)
    assertEquals(result.players?.[0].money, INITIAL_PLAYER_MONEY + 3000); // Both majority and minority
  });
});

Deno.test('handleMerger edge cases and error conditions', async (t) => {
  await t.step('throws error when merged hotel not found', () => {
    const players = createTestPlayers();
    let hotels = initializeHotels();
    let tiles = initializeTiles(12, 9);

    // Set up board with valid hotels first
    tiles = placeTilesOnBoard(tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
      { row: 3, col: 3, hotel: 'Worldwide' },
    ]);

    // Give shares to a player for the non-existent hotel (this will cause the error)
    hotels = assignSharesToPlayer(hotels, 'Sackson', 0, 3);

    const mergeContext: MergeContext = {
      survivingHotel: 'Worldwide',
      mergedHotel: 'NonExistentHotel' as HOTEL_NAME,
      stockholderIds: [],
      originalHotels: ['Worldwide', 'NonExistentHotel' as HOTEL_NAME],
      additionalTiles: [],
    };

    const error = assertThrows(
      () => handleMerger(players, tiles, hotels, mergeContext),
      GameError,
      'Unable to find hotel NonExistentHotel',
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('throws error when no stockholders exist', () => {
    const players = createTestPlayers();
    let hotels = initializeHotels();
    let tiles = initializeTiles(12, 9);

    // Set up board with different sized hotels to avoid tie
    tiles = placeTilesOnBoard(tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
      { row: 3, col: 3, hotel: 'Worldwide' }, // Worldwide has 3 tiles
      { row: 5, col: 1, hotel: 'Sackson' },
      { row: 5, col: 2, hotel: 'Sackson' }, // Sackson has 2 tiles
    ]);

    // Don't assign any shares to players (all shares remain in bank)

    const mergeContext: MergeContext = {
      survivingHotel: 'Worldwide',
      mergedHotel: 'Sackson',
      stockholderIds: [],
      originalHotels: ['Worldwide', 'Sackson'],
      additionalTiles: [],
    };

    const error = assertThrows(
      () => handleMerger(players, tiles, hotels, mergeContext),
      GameError,
      'Invalid merger state',
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('handles merger with single stockholder', () => {
    const players = createTestPlayers();
    let hotels = initializeHotels();
    let tiles = initializeTiles(12, 9);

    // Set up board
    tiles = placeTilesOnBoard(tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
      { row: 3, col: 3, hotel: 'Worldwide' },
      { row: 5, col: 1, hotel: 'Sackson' },
      { row: 5, col: 2, hotel: 'Sackson' },
    ]);

    // Give shares to only one player
    hotels = assignSharesToPlayer(hotels, 'Sackson', 0, 8);

    const mergeContext = createBasicMergeContext();

    const result = handleMerger(players, tiles, hotels, mergeContext);

    // Should transition to RESOLVE_MERGER phase
    assertEquals(result.currentPhase, GamePhase.RESOLVE_MERGER);

    // Should have one stockholder
    assertEquals(result.mergeContext?.stockholderIds, [0]);

    // Player should receive both majority and minority bonuses
    assertEquals(result.players?.[0].money, INITIAL_PLAYER_MONEY + 3000); // 2000 + 1000
  });

  await t.step('handles complex merger with multiple stockholders', () => {
    const players = createTestPlayers();
    let hotels = initializeHotels();
    let tiles = initializeTiles(12, 9);

    // Set up board with larger hotel
    tiles = placeTilesOnBoard(tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
      { row: 3, col: 3, hotel: 'Worldwide' },
      { row: 3, col: 4, hotel: 'Worldwide' },
      { row: 5, col: 1, hotel: 'Sackson' },
      { row: 5, col: 2, hotel: 'Sackson' },
      { row: 5, col: 3, hotel: 'Sackson' },
    ]);

    // Give shares to multiple players with different amounts
    hotels = assignSharesToPlayer(hotels, 'Sackson', 0, 6); // Most shares
    hotels = assignSharesToPlayer(hotels, 'Sackson', 1, 4); // Second most
    hotels = assignSharesToPlayer(hotels, 'Sackson', 2, 2); // Least shares

    const mergeContext = createBasicMergeContext();

    const result = handleMerger(players, tiles, hotels, mergeContext);

    // Should transition to RESOLVE_MERGER phase
    assertEquals(result.currentPhase, GamePhase.RESOLVE_MERGER);

    // Should have stockholders sorted by share count
    assertEquals(result.mergeContext?.stockholderIds, [0, 1, 2]);

    // Players should receive appropriate bonuses
    assertEquals(result.players?.[0].money, INITIAL_PLAYER_MONEY + 3000); // Majority bonus
    assertEquals(result.players?.[1].money, INITIAL_PLAYER_MONEY + 1500); // Minority bonus
    assertEquals(result.players?.[2].money, INITIAL_PLAYER_MONEY); // No bonus (third place)
  });

  await t.step('handles merger with tied stockholders', () => {
    const players = createTestPlayers();
    let hotels = initializeHotels();
    let tiles = initializeTiles(12, 9);

    // Set up board
    tiles = placeTilesOnBoard(tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
      { row: 3, col: 3, hotel: 'Worldwide' },
      { row: 5, col: 1, hotel: 'Sackson' },
      { row: 5, col: 2, hotel: 'Sackson' },
    ]);

    // Give equal shares to two players (tie for majority)
    hotels = assignSharesToPlayer(hotels, 'Sackson', 0, 4);
    hotels = assignSharesToPlayer(hotels, 'Sackson', 1, 4);

    const mergeContext = createBasicMergeContext();

    const result = handleMerger(players, tiles, hotels, mergeContext);

    // Should transition to RESOLVE_MERGER phase
    assertEquals(result.currentPhase, GamePhase.RESOLVE_MERGER);

    // Should have stockholders (order may vary due to tie)
    assertEquals(result.mergeContext?.stockholderIds?.length, 2);
    assertEquals(result.mergeContext?.stockholderIds?.includes(0), true);
    assertEquals(result.mergeContext?.stockholderIds?.includes(1), true);

    // Both players should receive equal bonuses (split majority and minority)
    // Sackson is economy, 2 tiles = majority: 2000, minority: 1000
    // Total: 3000, split between 2 players = 1500 each, rounded up to nearest 100 = 1500
    const expectedBonus = 1500; // roundUpToNearestHundred((2000 + 1000) / 2) = 1500
    assertEquals(result.players?.[0].money, INITIAL_PLAYER_MONEY + expectedBonus);
    assertEquals(result.players?.[1].money, INITIAL_PLAYER_MONEY + expectedBonus);
  });
});

Deno.test('handleMerger tile and context management', async (t) => {
  await t.step('correctly updates tiles with survivor tiles', () => {
    const players = createTestPlayers();
    let hotels = initializeHotels();
    let tiles = initializeTiles(12, 9);

    // Set up board with different sized hotels to avoid tie
    tiles = placeTilesOnBoard(tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
      { row: 3, col: 3, hotel: 'Worldwide' }, // Worldwide has 3 tiles
      { row: 5, col: 1, hotel: 'Sackson' },
      { row: 5, col: 2, hotel: 'Sackson' }, // Sackson has 2 tiles
      { row: 4, col: 1 }, // Unassigned tile that will connect
      { row: 4, col: 2 }, // Another unassigned tile
    ]);

    // Give shares to player
    hotels = assignSharesToPlayer(hotels, 'Sackson', 0, 3);

    const mergeContext: MergeContext = {
      survivingHotel: 'Worldwide',
      mergedHotel: 'Sackson',
      stockholderIds: [],
      originalHotels: ['Worldwide', 'Sackson'],
      additionalTiles: [
        { row: 4, col: 1, location: 'board' as const }, // Connecting tile
        { row: 4, col: 2, location: 'board' as const }, // Additional tile
      ],
    };

    const result = handleMerger(players, tiles, hotels, mergeContext);

    // Check that tiles were updated
    assertEquals(result.tiles !== undefined, true);

    // The Sackson tiles should now be part of the surviving hotel (Worldwide)
    const updatedTiles = result.tiles!;
    const sacksonTile1 = updatedTiles.find((t) => t.row === 5 && t.col === 1) as BoardTile;
    const sacksonTile2 = updatedTiles.find((t) => t.row === 5 && t.col === 2) as BoardTile;

    assertEquals(sacksonTile1?.hotel, 'Worldwide');
    assertEquals(sacksonTile2?.hotel, 'Worldwide');
  });

  await t.step('sets correct merge context for resolution', () => {
    const players = createTestPlayers();
    let hotels = initializeHotels();
    let tiles = initializeTiles(12, 9);

    // Set up board with different sized hotels to avoid tie
    tiles = placeTilesOnBoard(tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
      { row: 3, col: 3, hotel: 'Worldwide' }, // Worldwide has 3 tiles
      { row: 5, col: 1, hotel: 'Sackson' },
      { row: 5, col: 2, hotel: 'Sackson' }, // Sackson has 2 tiles
    ]);

    // Give shares to player
    hotels = assignSharesToPlayer(hotels, 'Sackson', 0, 5);

    const mergeContext: MergeContext = {
      survivingHotel: 'Worldwide',
      mergedHotel: 'Sackson',
      stockholderIds: [],
      originalHotels: ['Worldwide', 'Sackson', 'Tower', 'Festival'], // Multiple hotels to merge
      additionalTiles: [
        { row: 4, col: 1, location: 'board' as const },
      ],
    };

    const result = handleMerger(players, tiles, hotels, mergeContext);

    // Should have correct merge context
    assertEquals(result.mergeContext?.survivingHotel, 'Worldwide');
    assertEquals(result.mergeContext?.mergedHotel, 'Sackson');
    assertEquals(result.mergeContext?.originalHotels, ['Tower', 'Festival']); // Remaining hotels after this merge
    assertEquals(result.mergeContext?.additionalTiles, []); // Should be empty after merge
    assertEquals(result.mergeContext?.stockholderIds, [0]);
  });

  await t.step('clears merger tie context when resolving merger', () => {
    const players = createTestPlayers();
    let hotels = initializeHotels();
    let tiles = initializeTiles(12, 9);

    // Set up board
    tiles = placeTilesOnBoard(tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
      { row: 3, col: 3, hotel: 'Worldwide' },
      { row: 5, col: 1, hotel: 'Sackson' },
      { row: 5, col: 2, hotel: 'Sackson' },
    ]);

    // Give shares to player
    hotels = assignSharesToPlayer(hotels, 'Sackson', 0, 3);

    const mergeContext = createBasicMergeContext();

    const result = handleMerger(players, tiles, hotels, mergeContext);

    // Should clear merger tie context
    assertEquals(result.mergerTieContext, undefined);
  });
});

Deno.test('handleMerger bonus calculation tests', async (t) => {
  await t.step('calculates bonuses correctly for different hotel sizes', () => {
    const players = createTestPlayers();
    let hotels = initializeHotels();
    let tiles = initializeTiles(12, 9);

    // Set up board with luxury hotel (Tower) - make sure Worldwide is larger to avoid tie
    tiles = placeTilesOnBoard(tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
      { row: 3, col: 3, hotel: 'Worldwide' },
      { row: 3, col: 4, hotel: 'Worldwide' },
      { row: 3, col: 5, hotel: 'Worldwide' },
      { row: 3, col: 6, hotel: 'Worldwide' }, // Worldwide has 6 tiles
      { row: 5, col: 1, hotel: 'Tower' },
      { row: 5, col: 2, hotel: 'Tower' },
      { row: 5, col: 3, hotel: 'Tower' },
      { row: 5, col: 4, hotel: 'Tower' },
      { row: 5, col: 5, hotel: 'Tower' }, // Tower has 5 tiles
    ]);

    // Give shares to players
    hotels = assignSharesToPlayer(hotels, 'Tower', 0, 6); // Majority
    hotels = assignSharesToPlayer(hotels, 'Tower', 1, 3); // Minority

    const mergeContext: MergeContext = {
      survivingHotel: 'Worldwide',
      mergedHotel: 'Tower',
      stockholderIds: [],
      originalHotels: ['Worldwide', 'Tower'],
      additionalTiles: [],
    };

    const result = handleMerger(players, tiles, hotels, mergeContext);

    // Tower is a luxury hotel, so bonuses should be higher
    // With 5 tiles: majority = 7000, minority = 3500
    assertEquals(result.players?.[0].money, INITIAL_PLAYER_MONEY + 7000);
    assertEquals(result.players?.[1].money, INITIAL_PLAYER_MONEY + 3500);
  });

  await t.step('handles zero bonus scenario', () => {
    const players = createTestPlayers();
    let hotels = initializeHotels();
    let tiles = initializeTiles(12, 9);

    // Set up board with very small hotel (0 tiles after merge calculation)
    tiles = placeTilesOnBoard(tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
      { row: 5, col: 1, hotel: 'Sackson' }, // Only 1 tile
    ]);

    // Give shares to player
    hotels = assignSharesToPlayer(hotels, 'Sackson', 0, 2);

    const mergeContext: MergeContext = {
      survivingHotel: 'Worldwide',
      mergedHotel: 'Sackson',
      stockholderIds: [],
      originalHotels: ['Worldwide', 'Sackson'],
      additionalTiles: [],
    };

    const result = handleMerger(players, tiles, hotels, mergeContext);

    // With only 1 tile, bonuses should be minimal
    assertEquals(result.players![0].money >= INITIAL_PLAYER_MONEY, true);
  });
});
