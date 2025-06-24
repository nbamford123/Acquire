import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { breakMergerTieReducer } from '../breakMergerTieReducer.ts';
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
  type MergeContext,
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
    currentPhase: GamePhase.BREAK_MERGER_TIE,
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

// Helper function to create merge context
function createMergeContext(overrides: Partial<MergeContext> = {}): MergeContext {
  return {
    originalHotels: ['Worldwide', 'Sackson'],
    additionalTiles: [
      { row: 3, col: 3, location: 'board' as const },
    ],
    survivingHotel: 'Worldwide',
    ...overrides,
  };
}

Deno.test('breakMergerTieReducer validation tests', async (t) => {
  await t.step("throws error when not player's turn", () => {
    const gameState = createBasicGameState({
      currentPlayer: 1, // Different from action player (0)
      mergeContext: createMergeContext(),
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'TestPlayer',
        resolvedTie: { survivor: 'Worldwide' as HOTEL_NAME, merged: 'Sackson' as HOTEL_NAME },
      },
    };

    const error = assertThrows(
      () => breakMergerTieReducer(gameState, action),
      GameError,
      'Not your turn',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when not in BREAK_MERGER_TIE phase', () => {
    const gameState = createBasicGameState({
      currentPhase: GamePhase.BUY_SHARES,
      mergeContext: createMergeContext(),
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'TestPlayer',
        resolvedTie: { survivor: 'Worldwide' as HOTEL_NAME, merged: 'Sackson' as HOTEL_NAME },
      },
    };

    const error = assertThrows(
      () => breakMergerTieReducer(gameState, action),
      GameError,
      'Invalid action',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when survivor hotel is missing', () => {
    const gameState = createBasicGameState({
      mergeContext: createMergeContext(),
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'TestPlayer',
        resolvedTie: { survivor: undefined as any, merged: 'Sackson' as HOTEL_NAME },
      },
    };

    const error = assertThrows(
      () => breakMergerTieReducer(gameState, action),
      GameError,
      'Missing hotel names for merger tie break',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when merged hotel is missing', () => {
    const gameState = createBasicGameState({
      mergeContext: createMergeContext(),
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'TestPlayer',
        resolvedTie: { survivor: 'Worldwide' as HOTEL_NAME, merged: undefined as any },
      },
    };

    const error = assertThrows(
      () => breakMergerTieReducer(gameState, action),
      GameError,
      'Missing hotel names for merger tie break',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when merge context is missing', () => {
    const gameState = createBasicGameState({
      mergeContext: undefined,
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'TestPlayer',
        resolvedTie: { survivor: 'Worldwide' as HOTEL_NAME, merged: 'Sackson' as HOTEL_NAME },
      },
    };

    const error = assertThrows(
      () => breakMergerTieReducer(gameState, action),
      GameError,
      'Missing merge context for merger tie break',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });
});

Deno.test('breakMergerTieReducer merge context validation tests', async (t) => {
  await t.step('throws error when surviving hotel not found in game state', () => {
    const gameState = createBasicGameState({
      mergeContext: createMergeContext({
        survivingHotel: 'NonExistentHotel' as HOTEL_NAME,
      }),
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'TestPlayer',
        resolvedTie: { survivor: 'Worldwide' as HOTEL_NAME, merged: 'Sackson' as HOTEL_NAME },
      },
    };

    const error = assertThrows(
      () => breakMergerTieReducer(gameState, action),
      GameError,
      `Invalid merger context, couldn't find hotels`,
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('throws error when original hotels not found in game state', () => {
    const gameState = createBasicGameState({
      mergeContext: createMergeContext({
        originalHotels: ['NonExistentHotel1' as HOTEL_NAME, 'NonExistentHotel2' as HOTEL_NAME],
      }),
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'TestPlayer',
        resolvedTie: { survivor: 'Worldwide' as HOTEL_NAME, merged: 'Sackson' as HOTEL_NAME },
      },
    };

    const error = assertThrows(
      () => breakMergerTieReducer(gameState, action),
      GameError,
      'Hotel not found: NonExistentHotel1',
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('throws error when additional tiles reference invalid positions', () => {
    const gameState = createBasicGameState({
      mergeContext: createMergeContext({
        additionalTiles: [
          { row: 99, col: 99, location: 'board' as const }, // Invalid position
        ],
      }),
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'TestPlayer',
        resolvedTie: { survivor: 'Worldwide' as HOTEL_NAME, merged: 'Sackson' as HOTEL_NAME },
      },
    };

    const error = assertThrows(
      () => breakMergerTieReducer(gameState, action),
      GameError,
      `Invalid merger context, couldn't find hotels`,
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('throws error when merge context has empty original hotels', () => {
    const gameState = createBasicGameState({
      mergeContext: createMergeContext({
        originalHotels: [],
      }),
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'TestPlayer',
        resolvedTie: { survivor: 'Worldwide' as HOTEL_NAME, merged: 'Sackson' as HOTEL_NAME },
      },
    };

    const error = assertThrows(
      () => breakMergerTieReducer(gameState, action),
      GameError,
      `Invalid merger context, couldn't find hotels`,
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });
});

Deno.test('breakMergerTieReducer successful merger resolution tests', async (t) => {
  await t.step('successfully resolves merger tie with valid context', () => {
    let gameState = createBasicGameState();

    // Create hotels with shares owned by players
    const worldwideHotel = createHotel('Worldwide', 'economy');
    worldwideHotel.shares[0] = { location: 0 }; // Player 0 owns 1 share
    worldwideHotel.shares[1] = { location: 0 }; // Player 0 owns another share

    const sacksonHotel = createHotel('Sackson', 'standard');
    sacksonHotel.shares[0] = { location: 1 }; // Player 1 owns 1 share

    gameState.hotels[0] = worldwideHotel;
    gameState.hotels[1] = sacksonHotel;

    // Place hotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
      { row: 3, col: 4, hotel: 'Sackson' },
      { row: 3, col: 5, hotel: 'Sackson' },
      { row: 3, col: 3 }, // Connecting tile
    ]);

    gameState.mergeContext = createMergeContext({
      originalHotels: ['Worldwide', 'Sackson'],
      additionalTiles: [
        { row: 3, col: 3, location: 'board' as const },
      ],
      survivingHotel: 'Worldwide',
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'TestPlayer',
        resolvedTie: { survivor: 'Worldwide' as HOTEL_NAME, merged: 'Sackson' as HOTEL_NAME },
      },
    };

    const result = breakMergerTieReducer(gameState, action);

    // Should transition to RESOLVE_MERGER phase (based on handleMerger logic)
    assertEquals(result.currentPhase, GamePhase.RESOLVE_MERGER);

    // Should have merge context for resolution
    assertEquals(result.mergeContext !== undefined, true);
    assertEquals(result.mergeContext?.survivingHotel, 'Worldwide');
    assertEquals(result.mergeContext?.mergedHotel, 'Worldwide');

    // Should have stockholder information
    assertEquals(result.mergeContext?.stockholderIds !== undefined, true);
    if (result.mergeContext?.stockholderIds) {
      assertEquals(result.mergeContext.stockholderIds.length > 0, true);
    }

    // Merger tie context should be cleared
    assertEquals(result.mergerTieContext, undefined);
  });

  await t.step('preserves other game state properties during merger resolution', () => {
    let gameState = createBasicGameState({
      gameId: 'test-merger-123',
      owner: 'MergerOwner',
      currentTurn: 10,
      lastUpdated: 9876543210,
    });

    // Create hotels
    const imperialHotel = createHotel('Imperial', 'luxury');
    imperialHotel.shares[0] = { location: 0 };

    const festivalHotel = createHotel('Festival', 'economy');
    festivalHotel.shares[0] = { location: 1 };

    gameState.hotels[0] = imperialHotel;
    gameState.hotels[1] = festivalHotel;

    // Place hotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 5, col: 2, hotel: 'Imperial' },
      { row: 5, col: 4, hotel: 'Festival' },
      { row: 5, col: 3 }, // Connecting tile
    ]);

    gameState.mergeContext = createMergeContext({
      originalHotels: ['Imperial', 'Festival'],
      additionalTiles: [
        { row: 5, col: 3, location: 'board' as const },
      ],
      survivingHotel: 'Imperial',
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'TestPlayer',
        resolvedTie: { survivor: 'Imperial' as HOTEL_NAME, merged: 'Festival' as HOTEL_NAME },
      },
    };

    const result = breakMergerTieReducer(gameState, action);

    // Check that other properties are preserved
    assertEquals(result.gameId, 'test-merger-123');
    assertEquals(result.owner, 'MergerOwner');
    assertEquals(result.currentTurn, 10);
    assertEquals(result.currentPlayer, 0);
    assertEquals(result.lastUpdated, 9876543210);
    assertEquals(result.error, null);
  });

  await t.step('handles merger with multiple additional tiles', () => {
    let gameState = createBasicGameState();

    // Create hotels
    const americanHotel = createHotel('American', 'standard');
    americanHotel.shares[0] = { location: 0 };

    const continentalHotel = createHotel('Continental', 'standard');
    continentalHotel.shares[0] = { location: 1 };

    gameState.hotels[0] = americanHotel;
    gameState.hotels[1] = continentalHotel;

    // Place hotel tiles and additional tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 7, col: 1, hotel: 'American' },
      { row: 7, col: 5, hotel: 'Continental' },
      { row: 7, col: 2 }, // Additional tile 1
      { row: 7, col: 3 }, // Additional tile 2 (connecting)
      { row: 7, col: 4 }, // Additional tile 3
    ]);

    gameState.mergeContext = createMergeContext({
      originalHotels: ['American', 'Continental'],
      additionalTiles: [
        { row: 7, col: 2, location: 'board' as const },
        { row: 7, col: 3, location: 'board' as const },
        { row: 7, col: 4, location: 'board' as const },
      ],
      survivingHotel: 'American',
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'TestPlayer',
        resolvedTie: { survivor: 'American' as HOTEL_NAME, merged: 'Continental' as HOTEL_NAME },
      },
    };

    const result = breakMergerTieReducer(gameState, action);

    // Should successfully process merger with multiple additional tiles
    assertEquals(result.currentPhase, GamePhase.RESOLVE_MERGER);
    assertEquals(result.mergeContext?.survivingHotel, 'American');
    assertEquals(result.mergeContext?.mergedHotel, 'American');
  });

  await t.step('handles different player making the tie break decision', () => {
    let gameState = createBasicGameState({
      currentPlayer: 1, // Player 1's turn
    });

    // Create hotels
    const towerHotel = createHotel('Tower', 'luxury');
    towerHotel.shares[0] = { location: 1 };

    const worldwideHotel = createHotel('Worldwide', 'economy');
    worldwideHotel.shares[0] = { location: 0 };

    gameState.hotels[0] = towerHotel;
    gameState.hotels[1] = worldwideHotel;

    // Place hotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 8, col: 1, hotel: 'Tower' },
      { row: 8, col: 3, hotel: 'Worldwide' },
      { row: 8, col: 2 }, // Connecting tile
    ]);

    gameState.mergeContext = createMergeContext({
      originalHotels: ['Tower', 'Worldwide'],
      additionalTiles: [
        { row: 8, col: 2, location: 'board' as const },
      ],
      survivingHotel: 'Tower',
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'Player2', // Player 1 making the decision
        resolvedTie: { survivor: 'Tower' as HOTEL_NAME, merged: 'Worldwide' as HOTEL_NAME },
      },
    };

    const result = breakMergerTieReducer(gameState, action);

    // Should succeed
    assertEquals(result.currentPhase, GamePhase.RESOLVE_MERGER);
    assertEquals(result.mergeContext?.survivingHotel, 'Tower');
    assertEquals(result.mergeContext?.mergedHotel, 'Tower');
  });
});

Deno.test('breakMergerTieReducer edge cases', async (t) => {
  await t.step('handles merger with no stockholders (edge case)', () => {
    let gameState = createBasicGameState();

    // Create hotels with no shares owned by players (all in bank)
    const hotel1 = createHotel('Worldwide', 'economy');
    const hotel2 = createHotel('Sackson', 'standard');

    gameState.hotels[0] = hotel1;
    gameState.hotels[1] = hotel2;

    // Place hotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 2, col: 1, hotel: 'Worldwide' },
      { row: 2, col: 3, hotel: 'Sackson' },
      { row: 2, col: 2 }, // Connecting tile
    ]);

    gameState.mergeContext = createMergeContext({
      originalHotels: ['Worldwide', 'Sackson'],
      additionalTiles: [
        { row: 2, col: 2, location: 'board' as const },
      ],
      survivingHotel: 'Worldwide',
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'TestPlayer',
        resolvedTie: { survivor: 'Worldwide' as HOTEL_NAME, merged: 'Sackson' as HOTEL_NAME },
      },
    };

    // This should throw an error from handleMerger since no stockholders exist
    const error = assertThrows(
      () => breakMergerTieReducer(gameState, action),
      GameError,
      'Invalid merger state',
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('handles merger context with empty additional tiles', () => {
    let gameState = createBasicGameState();

    // Create hotels
    const hotel1 = createHotel('Imperial', 'luxury');
    hotel1.shares[0] = { location: 0 };

    const hotel2 = createHotel('Festival', 'economy');
    hotel2.shares[0] = { location: 1 };

    gameState.hotels[0] = hotel1;
    gameState.hotels[1] = hotel2;

    // Place hotel tiles on board (no additional connecting tiles)
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 4, col: 1, hotel: 'Imperial' },
      { row: 4, col: 2, hotel: 'Festival' },
    ]);

    gameState.mergeContext = createMergeContext({
      originalHotels: ['Imperial', 'Festival'],
      additionalTiles: [], // No additional tiles
      survivingHotel: 'Imperial',
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'TestPlayer',
        resolvedTie: { survivor: 'Imperial' as HOTEL_NAME, merged: 'Festival' as HOTEL_NAME },
      },
    };

    const result = breakMergerTieReducer(gameState, action);

    // Should still work with empty additional tiles
    assertEquals(result.currentPhase, GamePhase.RESOLVE_MERGER);
    assertEquals(result.mergeContext?.survivingHotel, 'Imperial');
    assertEquals(result.mergeContext?.mergedHotel, 'Imperial');
  });

  await t.step('validates that resolved tie hotels match available hotels', () => {
    let gameState = createBasicGameState();

    // Create hotels
    const hotel1 = createHotel('Worldwide', 'economy');
    hotel1.shares[0] = { location: 0 };

    const hotel2 = createHotel('Sackson', 'standard');
    hotel2.shares[0] = { location: 1 };

    gameState.hotels[0] = hotel1;
    gameState.hotels[1] = hotel2;

    // Place hotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 6, col: 1, hotel: 'Worldwide' },
      { row: 6, col: 3, hotel: 'Sackson' },
      { row: 6, col: 2 }, // Connecting tile
    ]);

    gameState.mergeContext = createMergeContext({
      originalHotels: ['Worldwide', 'Sackson'],
      additionalTiles: [
        { row: 6, col: 2, location: 'board' as const },
      ],
      survivingHotel: 'Worldwide',
    });

    const action = {
      type: ActionTypes.BREAK_MERGER_TIE,
      payload: {
        player: 'TestPlayer',
        // Player chooses hotels that exist in the game
        resolvedTie: { survivor: 'Worldwide' as HOTEL_NAME, merged: 'Sackson' as HOTEL_NAME },
      },
    };

    const result = breakMergerTieReducer(gameState, action);

    // Should succeed since hotels exist
    assertEquals(result.currentPhase, GamePhase.RESOLVE_MERGER);
    assertEquals(result.mergeContext?.survivingHotel, 'Worldwide');
    assertEquals(result.mergeContext?.mergedHotel, 'Worldwide');
  });
});
