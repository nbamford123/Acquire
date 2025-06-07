import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { expect } from 'jsr:@std/expect';
import { foundHotelReducer } from './foundHotelReducer.ts';
import { initializeTiles } from '@/engine/domain/tileOperations.ts';
import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type Hotel,
  type HOTEL_NAME,
  type HOTEL_TYPE,
  type Player,
  type Tile,
} from '@/engine/types/index.ts';
import { ActionTypes } from '@/engine/types/actionsTypes.ts';
import { INITIAL_PLAYER_MONEY } from '@/engine/config/gameConfig.ts';

// Helper function to create a basic game state
function createBasicGameState(overrides: Partial<GameState> = {}): GameState {
  const defaultPlayer: Player = {
    id: 0,
    name: 'TestPlayer',
    money: INITIAL_PLAYER_MONEY,
    shares: {},
    tiles: [],
  };

  const secondPlayer: Player = {
    id: 1,
    name: 'Player2',
    money: INITIAL_PLAYER_MONEY,
    shares: {},
    tiles: [],
  };

  return {
    gameId: 'test-game',
    owner: 'TestPlayer',
    currentPhase: GamePhase.FOUND_HOTEL,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [defaultPlayer, secondPlayer],
    hotels: [],
    tiles: initializeTiles(12, 9),
    error: null,
    lastActions: [],
    ...overrides,
  };
}

// Helper function to create a hotel
function createHotel(name: HOTEL_NAME, type: HOTEL_TYPE = 'economy', shareCount = 25): Hotel {
  return {
    name,
    type,
    tiles: [], // Empty tiles for unfounded hotel
    shares: Array(shareCount).fill(null).map((_, i) => ({
      location: 'bank' as const,
    })),
  };
}

// Helper function to create tiles on the board
function createBoardTiles(positions: Array<{ row: number; col: number }>): Tile[] {
  return positions.map((pos) => ({
    row: pos.row,
    col: pos.col,
    location: 'board' as const,
  }));
}

Deno.test('foundHotelReducer validation tests', async (t) => {
  await t.step("throws error when not player's turn", () => {
    const gameState = createBasicGameState({
      currentPlayer: 1, // Different from action player (0)
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'Worldwide' as HOTEL_NAME,
      },
    };

    const error = assertThrows(
      () => foundHotelReducer(gameState, action),
      GameError,
      'Not your turn',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when not in FOUND_HOTEL phase', () => {
    const gameState = createBasicGameState({
      currentPhase: GamePhase.PLAY_TILE,
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'Worldwide' as HOTEL_NAME,
      },
    };

    const error = assertThrows(
      () => foundHotelReducer(gameState, action),
      GameError,
      'Invalid action',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step("throws error when hotel doesn't exist in game state", () => {
    const gameState = createBasicGameState({
      hotels: [], // No hotels
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'Worldwide' as HOTEL_NAME,
      },
    };

    const error = assertThrows(
      () => foundHotelReducer(gameState, action),
      GameError,
      'Hotel Worldwide not found in game state',
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('throws error when hotel already exists (has tiles)', () => {
    const existingHotel = createHotel('Worldwide');
    existingHotel.tiles = createBoardTiles([{ row: 0, col: 0 }]); // Hotel already has tiles

    const gameState = createBasicGameState({
      hotels: [existingHotel],
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'Worldwide' as HOTEL_NAME,
      },
    };

    const error = assertThrows(
      () => foundHotelReducer(gameState, action),
      GameError,
      'Hotel Worldwide already exists',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when foundHotelContext is missing', () => {
    const hotel = createHotel('Worldwide');
    const gameState = createBasicGameState({
      hotels: [hotel],
      foundHotelContext: undefined, // Missing context
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'Worldwide' as HOTEL_NAME,
      },
    };

    const error = assertThrows(
      () => foundHotelReducer(gameState, action),
      GameError,
      "Can't found hotel Worldwide, context missing in state",
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('throws error when only one tile in context', () => {
    const hotel = createHotel('Worldwide');
    const contextTiles = createBoardTiles([{ row: 0, col: 0 }]); // Only 1 tile

    const gameState = createBasicGameState({
      hotels: [hotel],
      foundHotelContext: {
        availableHotels: [hotel],
        playedTile: contextTiles[0],
        tiles: contextTiles,
      },
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'Worldwide' as HOTEL_NAME,
      },
    };

    const error = assertThrows(
      () => foundHotelReducer(gameState, action),
      GameError,
      "Can't found hotel Worldwide, need at least two tiles",
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('throws error when context tiles are not on board', () => {
    const hotel = createHotel('Worldwide');
    const contextTiles = [
      { row: 0, col: 0, location: 'board' as const },
      { row: 0, col: 1, location: 0 as const }, // This tile is not on board (in player's hand)
    ];

    const gameState = createBasicGameState({
      hotels: [hotel],
      foundHotelContext: {
        availableHotels: [hotel],
        playedTile: contextTiles[0],
        tiles: contextTiles,
      },
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'Worldwide' as HOTEL_NAME,
      },
    };

    const error = assertThrows(
      () => foundHotelReducer(gameState, action),
      GameError,
      "Can't found hotel Worldwide, all tile not on board",
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });
});

Deno.test('foundHotelReducer successful founding tests', async (t) => {
  await t.step('successfully founds a hotel with two tiles', () => {
    const hotel = createHotel('Worldwide');
    const contextTiles = createBoardTiles([{ row: 0, col: 0 }, { row: 0, col: 1 }]);

    const gameState = createBasicGameState({
      hotels: [hotel],
      foundHotelContext: {
        availableHotels: [hotel],
        playedTile: contextTiles[0],
        tiles: contextTiles,
      },
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'Worldwide' as HOTEL_NAME,
      },
    };

    const result = foundHotelReducer(gameState, action);

    // Check phase transition
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);

    // Check hotel now has tiles
    assertEquals(result.hotels[0].tiles.length, 2);
    assertEquals(result.hotels[0].tiles[0].row, 0);
    assertEquals(result.hotels[0].tiles[0].col, 0);
    assertEquals(result.hotels[0].tiles[0].location, 'board');
    assertEquals(result.hotels[0].tiles[1].row, 0);
    assertEquals(result.hotels[0].tiles[1].col, 1);
    assertEquals(result.hotels[0].tiles[1].location, 'board');

    // Check founder gets first share
    assertEquals(result.hotels[0].shares[0].location, 0); // Player 0 gets first share
    assertEquals(result.hotels[0].shares[1].location, 'bank'); // Rest remain in bank

    // Check foundHotelContext is cleared
    assertEquals(result.foundHotelContext, undefined);
  });

  await t.step('successfully founds a hotel with multiple tiles', () => {
    const hotel = createHotel('Sackson', 'standard');
    const contextTiles = createBoardTiles([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
    ]);

    const gameState = createBasicGameState({
      hotels: [hotel],
      foundHotelContext: {
        availableHotels: [hotel],
        playedTile: contextTiles[0],
        tiles: contextTiles,
      },
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'Sackson' as HOTEL_NAME,
      },
    };

    const result = foundHotelReducer(gameState, action);

    // Check hotel now has all context tiles
    assertEquals(result.hotels[0].tiles.length, 3);
    assertEquals(result.hotels[0].tiles[0].row, 0);
    assertEquals(result.hotels[0].tiles[0].col, 0);
    assertEquals(result.hotels[0].tiles[1].row, 0);
    assertEquals(result.hotels[0].tiles[1].col, 1);
    assertEquals(result.hotels[0].tiles[2].row, 1);
    assertEquals(result.hotels[0].tiles[2].col, 0);

    // Check all tiles are marked as on board
    result.hotels[0].tiles.forEach((tile) => {
      assertEquals(tile.location, 'board');
    });

    // Check founder gets first share
    assertEquals(result.hotels[0].shares[0].location, 0);
  });

  await t.step('successfully founds hotel when some shares already owned', () => {
    const hotel = createHotel('Imperial', 'luxury');
    // Mark first share as already owned by another player
    hotel.shares[0].location = 1;

    const contextTiles = createBoardTiles([{ row: 5, col: 5 }, { row: 5, col: 6 }]);

    const gameState = createBasicGameState({
      hotels: [hotel],
      foundHotelContext: {
        availableHotels: [hotel],
        playedTile: contextTiles[0],
        tiles: contextTiles,
      },
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'Imperial' as HOTEL_NAME,
      },
    };

    const result = foundHotelReducer(gameState, action);

    // Check that player 0 gets the first available share (index 1)
    assertEquals(result.hotels[0].shares[0].location, 1); // Still owned by player 1
    assertEquals(result.hotels[0].shares[1].location, 0); // Now owned by player 0 (founder)
    assertEquals(result.hotels[0].shares[2].location, 'bank'); // Rest remain in bank
  });

  await t.step('successfully founds hotel with different player', () => {
    const hotel = createHotel('Festival');
    const contextTiles = createBoardTiles([{ row: 2, col: 3 }, { row: 2, col: 4 }]);

    const gameState = createBasicGameState({
      currentPlayer: 1, // Player 1's turn
      hotels: [hotel],
      foundHotelContext: {
        availableHotels: [hotel],
        playedTile: contextTiles[0],
        tiles: contextTiles,
      },
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 1, // Player 1 founding the hotel
        hotelName: 'Festival' as HOTEL_NAME,
      },
    };

    const result = foundHotelReducer(gameState, action);

    // Check that player 1 gets the founder's share
    assertEquals(result.hotels[0].shares[0].location, 1);
    assertEquals(result.hotels[0].tiles.length, 2);
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);
  });
});

Deno.test('foundHotelReducer edge cases', async (t) => {
  await t.step('handles hotel with no available shares in bank', () => {
    const hotel = createHotel('Tower', 'luxury', 1); // Only 1 share total
    hotel.shares[0].location = 1; // Already owned by player 1

    const contextTiles = createBoardTiles([{ row: 0, col: 0 }, { row: 0, col: 1 }]); // Need at least 2 tiles

    const gameState = createBasicGameState({
      hotels: [hotel],
      foundHotelContext: {
        availableHotels: [hotel],
        playedTile: contextTiles[0],
        tiles: contextTiles,
      },
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'Tower' as HOTEL_NAME,
      },
    };

    const result = foundHotelReducer(gameState, action);

    // Should still work, but founder doesn't get a share since none available
    assertEquals(result.hotels[0].shares[0].location, 1); // Still owned by player 1
    assertEquals(result.hotels[0].tiles.length, 2); // Now has 2 tiles
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);
  });

  await t.step('handles multiple hotels in game state', () => {
    const hotel1 = createHotel('American');
    const hotel2 = createHotel('Continental');
    const hotel3 = createHotel('Worldwide'); // This is the one being founded

    const contextTiles = createBoardTiles([{ row: 3, col: 4 }, { row: 3, col: 5 }]);

    const gameState = createBasicGameState({
      hotels: [hotel1, hotel2, hotel3],
      foundHotelContext: {
        availableHotels: [hotel3],
        playedTile: contextTiles[0],
        tiles: contextTiles,
      },
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'Worldwide' as HOTEL_NAME,
      },
    };

    const result = foundHotelReducer(gameState, action);

    // Check that only the target hotel was modified
    assertEquals(result.hotels[0].tiles.length, 0); // American unchanged
    assertEquals(result.hotels[1].tiles.length, 0); // Continental unchanged
    assertEquals(result.hotels[2].tiles.length, 2); // Worldwide now has tiles
    assertEquals(result.hotels[2].shares[0].location, 0); // Founder gets share
  });

  await t.step('preserves other game state properties', () => {
    const hotel = createHotel('Sackson');
    const contextTiles = createBoardTiles([{ row: 1, col: 1 }, { row: 1, col: 2 }]); // Need at least 2 tiles

    const gameState = createBasicGameState({
      gameId: 'test-123',
      owner: 'TestOwner',
      currentTurn: 5,
      lastUpdated: 1234567890,
      hotels: [hotel],
      foundHotelContext: {
        availableHotels: [hotel],
        playedTile: contextTiles[0],
        tiles: contextTiles,
      },
      lastActions: ['previous action'],
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'Sackson' as HOTEL_NAME,
      },
    };

    const result = foundHotelReducer(gameState, action);

    // Check that other properties are preserved
    assertEquals(result.gameId, 'test-123');
    assertEquals(result.owner, 'TestOwner');
    assertEquals(result.currentTurn, 5);
    assertEquals(result.currentPlayer, 0);
    assertEquals(result.lastUpdated, 1234567890);
    assertEquals(result.lastActions, ['previous action']);
    assertEquals(result.players, gameState.players);
    assertEquals(result.tiles, gameState.tiles);
    assertEquals(result.error, null);
  });
});

Deno.test('foundHotelReducer context tile validation', async (t) => {
  await t.step('handles context with all tiles on board', () => {
    const hotel = createHotel('Festival');
    const contextTiles = [
      { row: 0, col: 0, location: 'board' as const },
      { row: 0, col: 1, location: 'board' as const },
      { row: 1, col: 0, location: 'board' as const },
    ];

    const gameState = createBasicGameState({
      hotels: [hotel],
      foundHotelContext: {
        availableHotels: [hotel],
        playedTile: contextTiles[0],
        tiles: contextTiles,
      },
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'Festival' as HOTEL_NAME,
      },
    };

    const result = foundHotelReducer(gameState, action);

    // Should succeed
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);
    assertEquals(result.hotels[0].tiles.length, 3);
  });

  await t.step('rejects context with tiles in bag', () => {
    const hotel = createHotel('American');
    const contextTiles = [
      { row: 0, col: 0, location: 'board' as const },
      { row: 0, col: 1, location: 'bag' as const }, // Invalid location
    ];

    const gameState = createBasicGameState({
      hotels: [hotel],
      foundHotelContext: {
        availableHotels: [hotel],
        playedTile: contextTiles[0],
        tiles: contextTiles,
      },
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'American' as HOTEL_NAME,
      },
    };

    const error = assertThrows(
      () => foundHotelReducer(gameState, action),
      GameError,
      "Can't found hotel American, all tile not on board",
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('rejects context with dead tiles', () => {
    const hotel = createHotel('Continental');
    const contextTiles = [
      { row: 0, col: 0, location: 'board' as const },
      { row: 0, col: 1, location: 'dead' as const }, // Invalid location
    ];

    const gameState = createBasicGameState({
      hotels: [hotel],
      foundHotelContext: {
        availableHotels: [hotel],
        playedTile: contextTiles[0],
        tiles: contextTiles,
      },
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        playerId: 0,
        hotelName: 'Continental' as HOTEL_NAME,
      },
    };

    const error = assertThrows(
      () => foundHotelReducer(gameState, action),
      GameError,
      "Can't found hotel Continental, all tile not on board",
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });
});
