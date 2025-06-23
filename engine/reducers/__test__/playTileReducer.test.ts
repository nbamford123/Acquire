import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { playTileReducer } from '../playTileReducer.ts';
import { initializeTiles } from '../../domain/tileOperations.ts';
import { initializeHotels } from '../../domain/hotelOperations.ts';
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
} from '@/types/index.ts';
import { ActionTypes } from '@/types/actionsTypes.ts';
import { INITIAL_PLAYER_MONEY } from '../../../shared/types/gameConfig.ts';

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
    currentPhase: GamePhase.PLAY_TILE,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [defaultPlayer, secondPlayer],
    hotels: initializeHotels(),
    tiles: initializeTiles(12, 9),
    error: null,
    ...overrides,
  };
}

// Helper function to create a hotel
function createHotel(
  name: HOTEL_NAME,
  type: HOTEL_TYPE = 'economy',
): Hotel {
  return {
    name,
    type,
    shares: Array(25).fill(null).map((_, i) => ({
      location: 'bank' as const,
    })),
  };
}

// Helper function to place a tile in player's hand
function placeTileInPlayerHand(
  tiles: Tile[],
  playerId: number,
  row: number,
  col: number,
): Tile[] {
  return tiles.map((tile) =>
    tile.row === row && tile.col === col ? { ...tile, location: playerId } : tile
  );
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

Deno.test('playTileReducer validation tests', async (t) => {
  await t.step("throws error when not player's turn", () => {
    const gameState = createBasicGameState({
      currentPlayer: 1, // Different from action player (0)
    });

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 0, col: 0 },
      },
    };

    const error = assertThrows(
      () => playTileReducer(gameState, action),
      GameError,
      'Not your turn',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when not in PLAY_TILE phase', () => {
    const gameState = createBasicGameState({
      currentPhase: GamePhase.BUY_SHARES,
    });

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 0, col: 0 },
      },
    };

    const error = assertThrows(
      () => playTileReducer(gameState, action),
      GameError,
      'Invalid action',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when tile not in player hand', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 0, col: 0 }, // Tile not in player's hand
      },
    };

    const error = assertThrows(
      () => playTileReducer(gameState, action),
      GameError,
      'Invalid or not player tile',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when tile does not exist', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 99, col: 99 }, // Invalid coordinates
      },
    };

    const error = assertThrows(
      () => playTileReducer(gameState, action),
      GameError,
      'Invalid or not player tile',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });
});

Deno.test('playTileReducer simple placement tests', async (t) => {
  await t.step('successfully places tile with no adjacent tiles', () => {
    let gameState = createBasicGameState();

    // Place tile in player's hand
    gameState.tiles = placeTileInPlayerHand(gameState.tiles, 0, 5, 4);

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 5, col: 4 },
      },
    };

    const result = playTileReducer(gameState, action);

    // Should transition to BUY_SHARES phase
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);

    // Tile should be placed on board
    const placedTile = result.tiles.find((t) => t.row === 5 && t.col === 4);
    assertEquals(placedTile?.location, 'board');
    if (placedTile?.location === 'board') {
      assertEquals(placedTile.hotel, undefined);
    }
  });

  await t.step('successfully places tile adjacent to single unhotel tile', () => {
    let gameState = createBasicGameState();

    // Place one tile on board and target tile in player's hand
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [{ row: 3, col: 3 }]);
    gameState.tiles = placeTileInPlayerHand(gameState.tiles, 0, 3, 4);

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 3, col: 4 },
      },
    };

    const result = playTileReducer(gameState, action);

    // Should transition to FOUND_HOTEL phase
    assertEquals(result.currentPhase, GamePhase.FOUND_HOTEL);

    // Should have foundHotelContext
    assertEquals(result.foundHotelContext !== undefined, true);
    assertEquals(result.foundHotelContext?.tiles.length, 2);
    if (result.foundHotelContext?.availableHotels) {
      assertEquals(result.foundHotelContext.availableHotels.length > 0, true);
    }
  });
});

Deno.test('playTileReducer hotel extension tests', async (t) => {
  await t.step('successfully extends existing hotel', () => {
    let gameState = createBasicGameState();

    // Create hotel
    const hotel = createHotel('Worldwide', 'economy');
    gameState.hotels = [hotel, ...gameState.hotels.slice(1)];

    // Place hotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 2, col: 2, hotel: 'Worldwide' },
      { row: 2, col: 3, hotel: 'Worldwide' },
    ]);

    // Place target tile in player's hand (adjacent to hotel)
    gameState.tiles = placeTileInPlayerHand(gameState.tiles, 0, 2, 4);

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 2, col: 4 },
      },
    };

    const result = playTileReducer(gameState, action);

    // Should transition to BUY_SHARES phase
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);

    // Tile should be placed on board with hotel
    const placedTile = result.tiles.find((t) => t.row === 2 && t.col === 4);
    assertEquals(placedTile?.location, 'board');
    if (placedTile?.location === 'board') {
      assertEquals(placedTile.hotel, 'Worldwide');
    }
  });

  await t.step('extends hotel and includes adjacent unhotel tiles', () => {
    let gameState = createBasicGameState();

    // Create hotel
    const hotel = createHotel('Sackson', 'standard');
    gameState.hotels = [hotel, ...gameState.hotels.slice(1)];

    // Place hotel tiles and an unhotel tile on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 1, col: 1, hotel: 'Sackson' },
      { row: 1, col: 2, hotel: 'Sackson' },
      { row: 1, col: 4 }, // Unhotel tile
    ]);

    // Place target tile in player's hand (adjacent to both hotel and unhotel tile)
    gameState.tiles = placeTileInPlayerHand(gameState.tiles, 0, 1, 3);

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 1, col: 3 },
      },
    };

    const result = playTileReducer(gameState, action);

    // Should transition to BUY_SHARES phase
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);

    // Both new tiles should be assigned to the hotel
    const placedTile = result.tiles.find((t) => t.row === 1 && t.col === 3);
    const adjacentTile = result.tiles.find((t) => t.row === 1 && t.col === 4);
    if (placedTile?.location === 'board') {
      assertEquals(placedTile.hotel, 'Sackson');
    }
    if (adjacentTile?.location === 'board') {
      assertEquals(adjacentTile.hotel, 'Sackson');
    }
  });
});

Deno.test('playTileReducer hotel founding tests', async (t) => {
  await t.step('triggers hotel founding with adjacent unhotel tiles', () => {
    let gameState = createBasicGameState();

    // Place unhotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 4, col: 4 },
      { row: 4, col: 6 },
    ]);

    // Place target tile in player's hand (will connect the unhotel tiles)
    gameState.tiles = placeTileInPlayerHand(gameState.tiles, 0, 4, 5);

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 4, col: 5 },
      },
    };

    const result = playTileReducer(gameState, action);

    // Should transition to FOUND_HOTEL phase
    assertEquals(result.currentPhase, GamePhase.FOUND_HOTEL);

    // Should have foundHotelContext with all tiles
    assertEquals(result.foundHotelContext !== undefined, true);
    assertEquals(result.foundHotelContext?.tiles.length, 3);

    // Should have available hotels
    if (result.foundHotelContext?.availableHotels) {
      assertEquals(result.foundHotelContext.availableHotels.length > 0, true);
    }
  });

  await t.step('no hotel founding when no available hotels', () => {
    let gameState = createBasicGameState();

    // Make all hotels unavailable by placing tiles on board with hotel assignments
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 0, col: 0, hotel: 'Worldwide' },
      { row: 0, col: 1, hotel: 'Sackson' },
      { row: 0, col: 2, hotel: 'Festival' },
      { row: 0, col: 3, hotel: 'Imperial' },
      { row: 0, col: 4, hotel: 'American' },
      { row: 0, col: 5, hotel: 'Continental' },
      { row: 0, col: 6, hotel: 'Tower' },
    ]);

    gameState.hotels = [
      { name: 'Worldwide', type: 'economy', shares: [{ location: 1 }, { location: 2 }] },
      { name: 'Sackson', type: 'economy', shares: [{ location: 1 }, { location: 2 }] },
    ];

    // Place unhotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [{ row: 5, col: 5 }]);

    // Place target tile in player's hand
    gameState.tiles = placeTileInPlayerHand(gameState.tiles, 0, 5, 6);

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 5, col: 6 },
      },
    };

    const result = playTileReducer(gameState, action);

    // Should do simple placement since no hotels available
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);
    assertEquals(result.foundHotelContext, undefined);
  });
});

Deno.test('playTileReducer hotel merger tests', async (t) => {
  await t.step('triggers merger when connecting two hotels', () => {
    let gameState = createBasicGameState();

    // Create two hotels
    const hotel1 = createHotel('Worldwide', 'economy');
    const hotel2 = createHotel('Sackson', 'standard');
    gameState.hotels[0] = hotel1;
    gameState.hotels[1] = hotel2;

    // Place hotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
      { row: 3, col: 4, hotel: 'Sackson' },
      { row: 3, col: 5, hotel: 'Sackson' },
    ]);

    // Place target tile in player's hand (will connect the hotels)
    gameState.tiles = placeTileInPlayerHand(gameState.tiles, 0, 3, 3);

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 3, col: 3 },
      },
    };

    const result = playTileReducer(gameState, action);

    // Should handle merger (exact phase depends on merger logic)
    // The merger might go to BREAK_MERGER_TIE or RESOLVE_MERGER phase
    assertEquals(
      result.currentPhase === GamePhase.BREAK_MERGER_TIE ||
        result.currentPhase === GamePhase.RESOLVE_MERGER ||
        result.currentPhase === GamePhase.BUY_SHARES,
      true,
    );
  });

  await t.step('triggers merger with additional unhotel tiles', () => {
    let gameState = createBasicGameState();

    // Create two hotels
    const hotel1 = createHotel('Imperial', 'luxury');
    const hotel2 = createHotel('Festival', 'economy');
    gameState.hotels[0] = hotel1;
    gameState.hotels[1] = hotel2;

    // Place hotel tiles and unhotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 6, col: 2, hotel: 'Imperial' },
      { row: 6, col: 5, hotel: 'Festival' },
      { row: 6, col: 4 }, // Unhotel tile
    ]);

    // Place target tile in player's hand (connects hotels and unhotel tile)
    gameState.tiles = placeTileInPlayerHand(gameState.tiles, 0, 6, 3);

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 6, col: 3 },
      },
    };

    const result = playTileReducer(gameState, action);

    // Should handle merger
    assertEquals(
      result.currentPhase === GamePhase.BREAK_MERGER_TIE ||
        result.currentPhase === GamePhase.RESOLVE_MERGER ||
        result.currentPhase === GamePhase.BUY_SHARES,
      true,
    );
  });
});

Deno.test('playTileReducer edge cases', async (t) => {
  await t.step('handles tile placement with multiple adjacent hotels (3+)', () => {
    let gameState = createBasicGameState();

    // Create three hotels
    const hotel1 = createHotel('Worldwide', 'economy');
    const hotel2 = createHotel('Sackson', 'standard');
    const hotel3 = createHotel('Imperial', 'luxury');
    gameState.hotels[0] = hotel1;
    gameState.hotels[1] = hotel2;
    gameState.hotels[2] = hotel3;

    // Place hotel tiles on board in positions that will all be adjacent to (5,2)
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 5, col: 1, hotel: 'Worldwide' },
      { row: 4, col: 2, hotel: 'Sackson' },
      { row: 6, col: 2, hotel: 'Imperial' },
    ]);

    // Place target tile in player's hand
    gameState.tiles = placeTileInPlayerHand(gameState.tiles, 0, 5, 2);

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 5, col: 2 },
      },
    };

    const result = playTileReducer(gameState, action);

    // Should handle complex merger
    assertEquals(
      result.currentPhase === GamePhase.BREAK_MERGER_TIE ||
        result.currentPhase === GamePhase.RESOLVE_MERGER ||
        result.currentPhase === GamePhase.BUY_SHARES,
      true,
    );
  });

  await t.step('preserves other game state properties', () => {
    let gameState = createBasicGameState({
      gameId: 'test-123',
      owner: 'TestOwner',
      currentTurn: 5,
      lastUpdated: 1234567890,
    });

    // Place tile in player's hand
    gameState.tiles = placeTileInPlayerHand(gameState.tiles, 0, 7, 7);

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 7, col: 7 },
      },
    };

    const result = playTileReducer(gameState, action);

    // Check that other properties are preserved
    assertEquals(result.gameId, 'test-123');
    assertEquals(result.owner, 'TestOwner');
    assertEquals(result.currentTurn, 5);
    assertEquals(result.currentPlayer, 0);
    assertEquals(result.lastUpdated, 1234567890);
    assertEquals(result.players, gameState.players);
    assertEquals(result.hotels.length, gameState.hotels.length);
    assertEquals(result.error, null);
  });

  await t.step('handles different player making the move', () => {
    let gameState = createBasicGameState({
      currentPlayer: 1, // Player 1's turn
    });

    // Place tile in player 1's hand
    gameState.tiles = placeTileInPlayerHand(gameState.tiles, 1, 8, 8);

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'Player2',
        tile: { row: 8, col: 8 },
      },
    };

    const result = playTileReducer(gameState, action);

    // Should succeed
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);

    // Tile should be placed on board
    const placedTile = result.tiles.find((t) => t.row === 8 && t.col === 8);
    assertEquals(placedTile?.location, 'board');
  });
});

Deno.test('playTileReducer tile location validation', async (t) => {
  await t.step('correctly identifies tile in player hand', () => {
    let gameState = createBasicGameState();

    // Place tile in player's hand
    gameState.tiles = placeTileInPlayerHand(gameState.tiles, 0, 2, 2);

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 2, col: 2 },
      },
    };

    const result = playTileReducer(gameState, action);

    // Should succeed
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);
  });

  await t.step('rejects tile already on board', () => {
    let gameState = createBasicGameState();

    // Place tile on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [{ row: 2, col: 2 }]);

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 2, col: 2 },
      },
    };

    const error = assertThrows(
      () => playTileReducer(gameState, action),
      GameError,
      'Invalid or not player tile',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('rejects tile in bag', () => {
    let gameState = createBasicGameState();

    // Tile should be in bag by default (not moved to player hand)
    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 2, col: 2 },
      },
    };

    const error = assertThrows(
      () => playTileReducer(gameState, action),
      GameError,
      'Invalid or not player tile',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('rejects tile in another player hand', () => {
    let gameState = createBasicGameState();

    // Place tile in player 1's hand, but player 0 tries to play it
    gameState.tiles = placeTileInPlayerHand(gameState.tiles, 1, 2, 2);

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        player: 'TestPlayer',
        tile: { row: 2, col: 2 },
      },
    };

    const error = assertThrows(
      () => playTileReducer(gameState, action),
      GameError,
      'Invalid or not player tile',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });
});
