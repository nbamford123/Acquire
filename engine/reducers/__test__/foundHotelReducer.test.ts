import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { foundHotelReducer } from '../foundHotelReducer.ts';
import { initializeTiles } from '../../domain/tileOperations.ts';
import { initializeHotels } from '../../domain/hotelOperations.ts';
import {
  ActionTypes,
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type Hotel,
  type HOTEL_NAME,
  type HOTEL_TYPE,
  INITIAL_PLAYER_MONEY,
  type Player,
  type Tile,
} from '../../types/index.ts';

// Helper function to create a basic game state
function createBasicGameState(overrides: Partial<GameState> = {}): GameState {
  const defaultPlayer: Player = {
    id: 0,
    name: 'TestPlayer',
    money: INITIAL_PLAYER_MONEY,
  };

  const secondPlayer: Player = {
    id: 1,
    name: 'Player2',
    money: INITIAL_PLAYER_MONEY,
  };

  return {
    gameId: 'test-game',
    owner: 'TestPlayer',
    currentPhase: GamePhase.FOUND_HOTEL,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [defaultPlayer, secondPlayer],
    hotels: initializeHotels(),
    tiles: initializeTiles(12, 9),
    error: null,
    foundHotelContext: {
      availableHotels: ['Worldwide', 'Sackson', 'Festival'],
      tiles: [
        { row: 3, col: 1 },
        { row: 3, col: 2 },
      ],
    },
    ...overrides,
  };
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

Deno.test('foundHotelReducer validation tests', async (t) => {
  await t.step("throws error when not player's turn", () => {
    const gameState = createBasicGameState({
      currentPlayer: 1, // Different from action player (0)
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        player: 'TestPlayer',
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
        player: 'TestPlayer',
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

  await t.step('throws error when hotel not found in game state', () => {
    const gameState = createBasicGameState({
      hotels: [], // Empty hotels array
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        player: 'TestPlayer',
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

  await t.step('throws error when hotel already exists on board', () => {
    let gameState = createBasicGameState();

    // Place hotel tiles on board to show hotel already exists
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 5, col: 1, hotel: 'Worldwide' },
      { row: 5, col: 2, hotel: 'Worldwide' },
    ]);

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        player: 'TestPlayer',
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
    const gameState = createBasicGameState({
      foundHotelContext: undefined,
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        player: 'TestPlayer',
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

  await t.step('throws error when foundHotelContext has too few tiles', () => {
    const gameState = createBasicGameState({
      foundHotelContext: {
        availableHotels: ['Worldwide', 'Sackson', 'Festival'],
        tiles: [{ row: 3, col: 1 }], // Only 1 tile, need at least 2
      },
    });

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        player: 'TestPlayer',
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

  await t.step('throws error when tiles in context are not on board', () => {
    let gameState = createBasicGameState({
      foundHotelContext: {
        availableHotels: ['Worldwide', 'Sackson', 'Festival'],
        tiles: [
          { row: 3, col: 1 },
          { row: 3, col: 2 },
        ],
      },
    });

    // Don't place the tiles on the board - they should be in bag or player hand
    // This will cause the validation to fail

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        player: 'TestPlayer',
        hotelName: 'Worldwide' as HOTEL_NAME,
      },
    };

    const error = assertThrows(
      () => foundHotelReducer(gameState, action),
      GameError,
      'Invalid tiles in found hotel context',
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });
});

Deno.test('foundHotelReducer successful founding tests', async (t) => {
  await t.step('successfully founds hotel with valid context', () => {
    let gameState = createBasicGameState();

    // Place the context tiles on the board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1 }, // No hotel assigned yet
      { row: 3, col: 2 }, // No hotel assigned yet
    ]);

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        player: 'TestPlayer',
        hotelName: 'Worldwide' as HOTEL_NAME,
      },
    };

    const result = foundHotelReducer(gameState, action);

    // Should transition to BUY_SHARES phase
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);

    // foundHotelContext should be cleared
    assertEquals(result.foundHotelContext, undefined);

    // Player should receive one share of the founded hotel
    const worldwideHotel = result.hotels.find((h) => h.name === 'Worldwide');
    const playerShares = worldwideHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerShares, 1);

    // Bank should have one less share
    const bankShares = worldwideHotel?.shares.filter((s) => s.location === 'bank').length;
    assertEquals(bankShares, 24);

    // Tiles should be assigned to the hotel
    const hotelTiles = result.tiles.filter((t) =>
      t.location === 'board' && t.hotel === 'Worldwide'
    );
    assertEquals(hotelTiles.length, 2);
    assertEquals(hotelTiles[0].row, 3);
    assertEquals(hotelTiles[0].col, 1);
    assertEquals(hotelTiles[1].row, 3);
    assertEquals(hotelTiles[1].col, 2);
  });

  await t.step('successfully founds hotel with multiple tiles', () => {
    let gameState = createBasicGameState({
      foundHotelContext: {
        availableHotels: ['Worldwide', 'Sackson', 'Festival'],
        tiles: [
          { row: 3, col: 1 },
          { row: 3, col: 2 },
          { row: 3, col: 3 },
          { row: 4, col: 1 },
        ],
      },
    });

    // Place all context tiles on the board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1 },
      { row: 3, col: 2 },
      { row: 3, col: 3 },
      { row: 4, col: 1 },
    ]);

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        player: 'TestPlayer',
        hotelName: 'Sackson' as HOTEL_NAME,
      },
    };

    const result = foundHotelReducer(gameState, action);

    // All tiles should be assigned to the hotel
    const hotelTiles = result.tiles.filter((t) => t.location === 'board' && t.hotel === 'Sackson');
    assertEquals(hotelTiles.length, 4);

    // Player should still receive exactly one share
    const sacksonHotel = result.hotels.find((h) => h.name === 'Sackson');
    const playerShares = sacksonHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerShares, 1);
  });

  await t.step('awards share to correct player', () => {
    let gameState = createBasicGameState({
      currentPlayer: 1, // Player 1's turn
    });

    // Place the context tiles on the board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1 },
      { row: 3, col: 2 },
    ]);

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        player: 'Player2', // Player 1 founding the hotel
        hotelName: 'Festival' as HOTEL_NAME,
      },
    };

    const result = foundHotelReducer(gameState, action);

    // Player 1 should receive the share, not player 0
    const festivalHotel = result.hotels.find((h) => h.name === 'Festival');
    const player0Shares = festivalHotel?.shares.filter((s) => s.location === 0).length;
    const player1Shares = festivalHotel?.shares.filter((s) => s.location === 1).length;

    assertEquals(player0Shares, 0);
    assertEquals(player1Shares, 1);
  });

  await t.step('preserves other game state properties', () => {
    let gameState = createBasicGameState({
      gameId: 'test-found-hotel-123',
      owner: 'HotelFounder',
      currentTurn: 5,
      lastUpdated: 1234567890,
    });

    // Place the context tiles on the board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1 },
      { row: 3, col: 2 },
    ]);

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        player: 'TestPlayer',
        hotelName: 'Imperial' as HOTEL_NAME,
      },
    };

    const result = foundHotelReducer(gameState, action);

    // Check that other properties are preserved
    assertEquals(result.gameId, 'test-found-hotel-123');
    assertEquals(result.owner, 'HotelFounder');
    assertEquals(result.currentTurn, 5);
    assertEquals(result.currentPlayer, 0); // Should remain unchanged
    assertEquals(result.lastUpdated, 1234567890);
    assertEquals(result.error, null);
  });

  await t.step('handles different hotel types correctly', () => {
    let gameState = createBasicGameState();

    // Place the context tiles on the board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1 },
      { row: 3, col: 2 },
    ]);

    // Test founding a luxury hotel
    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        player: 'TestPlayer',
        hotelName: 'Tower' as HOTEL_NAME, // Tower is a luxury hotel
      },
    };

    const result = foundHotelReducer(gameState, action);

    // Should work the same regardless of hotel type
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);

    const towerHotel = result.hotels.find((h) => h.name === 'Tower');
    const playerShares = towerHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerShares, 1);
  });
});

Deno.test('foundHotelReducer edge cases', async (t) => {
  await t.step('handles founding when hotel has no available shares', () => {
    let gameState = createBasicGameState();

    // Assign all shares of Worldwide to other players
    const worldwideHotel = gameState.hotels.find((h) => h.name === 'Worldwide')!;
    for (let i = 0; i < 25; i++) {
      worldwideHotel.shares[i] = { location: 1 }; // All shares to player 1
    }

    // Place the context tiles on the board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1 },
      { row: 3, col: 2 },
    ]);

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        player: 'TestPlayer',
        hotelName: 'Worldwide' as HOTEL_NAME,
      },
    };

    const result = foundHotelReducer(gameState, action);

    // Should still succeed, but player gets no share
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);

    const resultHotel = result.hotels.find((h) => h.name === 'Worldwide');
    const player0Shares = resultHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(player0Shares, 0); // No shares available to award
  });

  await t.step('handles minimum tile requirement exactly', () => {
    let gameState = createBasicGameState({
      foundHotelContext: {
        availableHotels: ['Worldwide', 'Sackson', 'Festival'],
        tiles: [
          { row: 3, col: 1 },
          { row: 3, col: 2 }, // Exactly 2 tiles (minimum)
        ],
      },
    });

    // Place the context tiles on the board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1 },
      { row: 3, col: 2 },
    ]);

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        player: 'TestPlayer',
        hotelName: 'Continental' as HOTEL_NAME,
      },
    };

    const result = foundHotelReducer(gameState, action);

    // Should succeed with exactly 2 tiles
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);

    const hotelTiles = result.tiles.filter((t) =>
      t.location === 'board' && t.hotel === 'Continental'
    );
    assertEquals(hotelTiles.length, 2);
  });
});
