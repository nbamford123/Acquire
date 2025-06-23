import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { buySharesReducer } from '../buySharesReducer.ts';
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
    currentPhase: GamePhase.BUY_SHARES,
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

// Helper function to place tiles in player's hand
function placeTilesInPlayerHand(
  tiles: Tile[],
  playerId: number,
  positions: Array<{ row: number; col: number }>,
): Tile[] {
  return tiles.map((tile) => {
    const playerTile = positions.find((pos) => pos.row === tile.row && pos.col === tile.col);
    if (playerTile) {
      return {
        ...tile,
        location: playerId,
      };
    }
    return tile;
  });
}

Deno.test('buySharesReducer validation tests', async (t) => {
  await t.step("throws error when not player's turn", () => {
    const gameState = createBasicGameState({
      currentPlayer: 1, // Different from action player (0)
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { Worldwide: 1 },
      },
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError,
      'Not your turn',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when not in BUY_SHARES phase', () => {
    const gameState = createBasicGameState({
      currentPhase: GamePhase.PLAY_TILE,
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { Worldwide: 1 },
      },
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError,
      'Invalid action',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when buying more than 3 shares', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { Worldwide: 2, Sackson: 2 }, // Total of 4 shares
      },
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError,
      'Only 3 shares may be purchased per turn',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when buying zero shares', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { Worldwide: 0 },
      },
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError,
      `Can't buy zero shares in hotel Worldwide`,
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when hotel does not exist', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { NonExistentHotel: 1 } as any,
      },
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError,
      `Hotel NonExistentHotel doesn't exist`,
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when hotel does not have enough shares', () => {
    let gameState = createBasicGameState();

    // Create a hotel with only 1 share available
    const worldwideHotel = createHotel('Worldwide', 'economy');
    // Assign 24 shares to player 1, leaving only 1 in bank
    for (let i = 0; i < 24; i++) {
      worldwideHotel.shares[i] = { location: 1 };
    }
    gameState.hotels[0] = worldwideHotel;

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { Worldwide: 2 }, // Trying to buy 2 when only 1 available
      },
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError,
      `Hotel Worldwide doesn't have enough shares`,
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when player does not have enough money', () => {
    let gameState = createBasicGameState();

    // Set player money to a low amount
    gameState.players[0] = { ...gameState.players[0], money: 100 };

    // Place hotel tiles on board to establish hotel prices
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
    ]);

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { Worldwide: 3 }, // 3 shares at 200 each = 600, but player only has 100
      },
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError,
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
    assertEquals(error.message.includes('You need $600'), true);
    assertEquals(error.message.includes('you only have $100'), true);
  });

  await t.step('throws error when player has too many tiles', () => {
    let gameState = createBasicGameState();

    // Give player 6 tiles (maximum allowed)
    gameState.tiles = placeTilesInPlayerHand(gameState.tiles, 0, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
      { row: 0, col: 5 },
    ]);

    // Place hotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
    ]);

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { Worldwide: 1 },
      },
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError,
      `Player 0 has invalid number of tiles`,
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });
});

Deno.test('buySharesReducer successful purchase tests', async (t) => {
  await t.step('successfully buys single share', () => {
    let gameState = createBasicGameState();

    // Place hotel tiles on board to establish hotel
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
    ]);

    // Give player some tiles
    gameState.tiles = placeTilesInPlayerHand(gameState.tiles, 0, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { Worldwide: 1 },
      },
    };

    const result = buySharesReducer(gameState, action);

    // Should transition to PLAY_TILE phase
    assertEquals(result.currentPhase, GamePhase.PLAY_TILE);

    // Should advance to next player
    assertEquals(result.currentPlayer, 1);

    // Player should own 1 share of Worldwide
    const worldwideHotel = result.hotels.find((h) => h.name === 'Worldwide');
    const playerShares = worldwideHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerShares, 1);

    // Player money should be reduced by share price (200 for 2-tile economy hotel)
    assertEquals(result.players[0].money, INITIAL_PLAYER_MONEY - 200);

    // Merge contexts should be cleared
    assertEquals(result.mergeContext, undefined);
    assertEquals(result.mergerTieContext, undefined);
  });

  await t.step('successfully buys multiple shares of same hotel', () => {
    let gameState = createBasicGameState();

    // Place hotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'Sackson' },
      { row: 3, col: 2, hotel: 'Sackson' },
      { row: 3, col: 3, hotel: 'Sackson' },
    ]);

    // Give player some tiles
    gameState.tiles = placeTilesInPlayerHand(gameState.tiles, 0, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { Sackson: 3 },
      },
    };

    const result = buySharesReducer(gameState, action);

    // Player should own 3 shares of Sackson
    const sacksonHotel = result.hotels.find((h) => h.name === 'Sackson');
    const playerShares = sacksonHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerShares, 3);

    // Player money should be reduced by 3 * share price (300 for 3-tile economy hotel)
    assertEquals(result.players[0].money, INITIAL_PLAYER_MONEY - (3 * 300));
  });

  await t.step('successfully buys shares of multiple hotels', () => {
    let gameState = createBasicGameState();

    // Place hotel tiles on board for multiple hotels
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
      { row: 5, col: 1, hotel: 'Festival' },
      { row: 5, col: 2, hotel: 'Festival' },
    ]);

    // Give player some tiles
    gameState.tiles = placeTilesInPlayerHand(gameState.tiles, 0, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { Worldwide: 1, Festival: 2 },
      },
    };

    const result = buySharesReducer(gameState, action);

    // Player should own shares in both hotels
    const worldwideHotel = result.hotels.find((h) => h.name === 'Worldwide');
    const festivalHotel = result.hotels.find((h) => h.name === 'Festival');

    const worldwideShares = worldwideHotel?.shares.filter((s) => s.location === 0).length;
    const festivalShares = festivalHotel?.shares.filter((s) => s.location === 0).length;

    assertEquals(worldwideShares, 1);
    assertEquals(festivalShares, 2);

    // Player money should be reduced by total cost
    // Worldwide: 1 * 200 = 200, Festival: 2 * 300 = 600, Total: 800
    assertEquals(result.players[0].money, INITIAL_PLAYER_MONEY - 800);
  });

  await t.step('advances turn correctly when reaching player 0', () => {
    let gameState = createBasicGameState({
      currentPlayer: 1, // Player 1's turn
      currentTurn: 5,
    });

    // Place hotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'Imperial' },
      { row: 3, col: 2, hotel: 'Imperial' },
    ]);

    // Give player some tiles
    gameState.tiles = placeTilesInPlayerHand(gameState.tiles, 1, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'Player2',
        shares: { Imperial: 1 },
      },
    };

    const result = buySharesReducer(gameState, action);

    // Should advance to player 0 and increment turn
    assertEquals(result.currentPlayer, 0);
    assertEquals(result.currentTurn, 6);
  });

  await t.step('preserves other game state properties', () => {
    let gameState = createBasicGameState({
      gameId: 'test-buy-shares-123',
      owner: 'SharesOwner',
      lastUpdated: 1234567890,
    });

    // Place hotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'Tower' },
      { row: 3, col: 2, hotel: 'Tower' },
    ]);

    // Give player some tiles
    gameState.tiles = placeTilesInPlayerHand(gameState.tiles, 0, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { Tower: 1 },
      },
    };

    const result = buySharesReducer(gameState, action);

    // Check that other properties are preserved
    assertEquals(result.gameId, 'test-buy-shares-123');
    assertEquals(result.owner, 'SharesOwner');
    assertEquals(result.lastUpdated, 1234567890);
  });
});

Deno.test('buySharesReducer tile drawing tests', async (t) => {
  await t.step('draws tile for current player after purchase', () => {
    let gameState = createBasicGameState();

    // Place hotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'American' },
      { row: 3, col: 2, hotel: 'American' },
    ]);

    // Give player some tiles (less than 6)
    gameState.tiles = placeTilesInPlayerHand(gameState.tiles, 0, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);

    const initialPlayerTileCount = gameState.tiles.filter((t) => t.location === 0).length;

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { American: 1 },
      },
    };

    const result = buySharesReducer(gameState, action);

    // Player should have one more tile
    const finalPlayerTileCount = result.tiles.filter((t) => t.location === 0).length;
    assertEquals(finalPlayerTileCount, initialPlayerTileCount + 1);
  });

  await t.step('handles empty shares purchase (no shares specified)', () => {
    let gameState = createBasicGameState();

    // Give player some tiles
    gameState.tiles = placeTilesInPlayerHand(gameState.tiles, 0, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: {}, // No shares to buy
      },
    };

    const result = buySharesReducer(gameState, action);

    // Should still advance turn and draw tile
    assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
    assertEquals(result.currentPlayer, 1);

    // Player money should be unchanged
    assertEquals(result.players[0].money, INITIAL_PLAYER_MONEY);
  });
});

Deno.test('buySharesReducer edge cases', async (t) => {
  await t.step('handles purchase when exactly 3 shares bought', () => {
    let gameState = createBasicGameState();

    // Place hotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'Continental' },
      { row: 3, col: 2, hotel: 'Continental' },
    ]);

    // Give player some tiles
    gameState.tiles = placeTilesInPlayerHand(gameState.tiles, 0, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { Continental: 3 }, // Exactly 3 shares (maximum allowed)
      },
    };

    const result = buySharesReducer(gameState, action);

    // Should succeed
    assertEquals(result.currentPhase, GamePhase.PLAY_TILE);

    // Player should own 3 shares
    const continentalHotel = result.hotels.find((h) => h.name === 'Continental');
    const playerShares = continentalHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerShares, 3);
  });

  await t.step('handles different hotel types with different prices', () => {
    let gameState = createBasicGameState();

    // Place tiles for luxury hotel (higher price)
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'Tower' }, // Tower is luxury type
      { row: 3, col: 2, hotel: 'Tower' },
    ]);

    // Give player some tiles
    gameState.tiles = placeTilesInPlayerHand(gameState.tiles, 0, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { Tower: 1 },
      },
    };

    const result = buySharesReducer(gameState, action);

    // Player money should be reduced by luxury hotel price (400 for 2-tile luxury hotel)
    assertEquals(result.players[0].money, INITIAL_PLAYER_MONEY - 400);
  });

  await t.step('handles player with exactly enough money', () => {
    let gameState = createBasicGameState();

    // Set player money to exactly the cost of 1 share
    gameState.players[0] = { ...gameState.players[0], money: 200 };

    // Place hotel tiles on board
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'Worldwide' },
      { row: 3, col: 2, hotel: 'Worldwide' },
    ]);

    // Give player some tiles
    gameState.tiles = placeTilesInPlayerHand(gameState.tiles, 0, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { Worldwide: 1 },
      },
    };

    const result = buySharesReducer(gameState, action);

    // Should succeed and player should have 0 money left
    assertEquals(result.players[0].money, 0);

    const worldwideHotel = result.hotels.find((h) => h.name === 'Worldwide');
    const playerShares = worldwideHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerShares, 1);
  });
});
