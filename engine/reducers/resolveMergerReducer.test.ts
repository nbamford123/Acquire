import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { resolveMergerReducer } from './resolveMergerReducer.ts';
import { initializeHotels, initializeTiles } from '../domain/index.ts';
import {
  ActionTypes,
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type Hotel,
  type HOTEL_NAME,
  type Player,
  type Tile,
} from '@/types/index.ts';
import { INITIAL_PLAYER_MONEY } from '../../shared/types/gameConfig.ts';

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
    currentPhase: GamePhase.RESOLVE_MERGER,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [defaultPlayer, secondPlayer],
    hotels: initializeHotels(),
    tiles: initializeTiles(12, 9),
    error: null,
    mergeContext: {
      survivingHotel: 'Worldwide',
      mergedHotel: 'Sackson',
      stockholderIds: [0],
      originalHotels: [],
      additionalTiles: [],
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

// Helper function to assign shares to a player
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

Deno.test('resolveMergerReducer validation tests', async (t) => {
  await t.step('throws error when not in RESOLVE_MERGER phase', () => {
    const gameState = createBasicGameState({
      currentPhase: GamePhase.PLAY_TILE,
    });

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 2,
          trade: 4,
        },
      },
    };

    const error = assertThrows(
      () => resolveMergerReducer(gameState, action),
      GameError,
      'Not resolve merge phase',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when merge context is missing', () => {
    const gameState = createBasicGameState({
      mergeContext: undefined,
    });

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 2,
          trade: 4,
        },
      },
    };

    const error = assertThrows(
      () => resolveMergerReducer(gameState, action),
      GameError,
      'Invalid hotel merger context',
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('throws error when stockholder IDs are missing', () => {
    const gameState = createBasicGameState({
      mergeContext: {
        survivingHotel: 'Worldwide',
        mergedHotel: 'Sackson',
        stockholderIds: [],
        originalHotels: [],
        additionalTiles: [],
      },
    });

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 2,
          trade: 4,
        },
      },
    };

    const error = assertThrows(
      () => resolveMergerReducer(gameState, action),
      GameError,
      'Invalid player id for merger',
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('throws error when wrong player tries to resolve', () => {
    const gameState = createBasicGameState({
      mergeContext: {
        survivingHotel: 'Worldwide',
        mergedHotel: 'Sackson',
        stockholderIds: [1], // Player 1 should resolve
        originalHotels: [],
        additionalTiles: [],
      },
    });

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0, // Player 0 trying to resolve
        shares: {
          sell: 2,
          trade: 4,
        },
      },
    };

    const error = assertThrows(
      () => resolveMergerReducer(gameState, action),
      GameError,
      'Invalid player id for merger',
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('throws error when player does not have enough shares to trade/sell', () => {
    let gameState = createBasicGameState();

    // Give player only 2 shares in Sackson
    gameState.hotels = assignSharesToPlayer(gameState.hotels, 'Sackson', 0, 2);

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 2,
          trade: 2, // Total 4 shares needed, but player only has 2
        },
      },
    };

    const error = assertThrows(
      () => resolveMergerReducer(gameState, action),
      GameError,
      "You don't have 4 shares in Sackson to trade/sell",
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when trying to trade odd number of shares', () => {
    let gameState = createBasicGameState();

    // Give player enough shares
    gameState.hotels = assignSharesToPlayer(gameState.hotels, 'Sackson', 0, 5);

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 0,
          trade: 3, // Odd number - should fail
        },
      },
    };

    const error = assertThrows(
      () => resolveMergerReducer(gameState, action),
      GameError,
      'You can only trade an even number of shares',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when surviving hotel does not have enough shares for trade', () => {
    let gameState = createBasicGameState();

    // Give player enough shares in merged hotel
    gameState.hotels = assignSharesToPlayer(gameState.hotels, 'Sackson', 0, 6);

    // Give all shares of surviving hotel to another player (none left in bank)
    gameState.hotels = assignSharesToPlayer(gameState.hotels, 'Worldwide', 1, 25);

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 0,
          trade: 6, // Would need 3 shares from Worldwide, but none available
        },
      },
    };

    const error = assertThrows(
      () => resolveMergerReducer(gameState, action),
      GameError,
      "Worldwide doesn't have 3 shares left to trade",
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when hotels are not found in game state', () => {
    const gameState = createBasicGameState({
      mergeContext: {
        survivingHotel: 'NonExistentHotel' as HOTEL_NAME,
        mergedHotel: 'Sackson',
        stockholderIds: [0],
        originalHotels: [],
        additionalTiles: [],
      },
    });

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 2,
          trade: 4,
        },
      },
    };

    const error = assertThrows(
      () => resolveMergerReducer(gameState, action),
      GameError,
      'Invalid merge hotel name(s): NonExistentHotel,Sackson',
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });
});

Deno.test('resolveMergerReducer successful resolution tests', async (t) => {
  await t.step('successfully resolves merger with only selling shares', () => {
    let gameState = createBasicGameState();

    // Give player 5 shares in merged hotel
    gameState.hotels = assignSharesToPlayer(gameState.hotels, 'Sackson', 0, 5);

    // Place tiles on board to establish hotel prices
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'Sackson' },
      { row: 3, col: 2, hotel: 'Sackson' },
    ]);

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 3,
          trade: 0,
        },
      },
    };

    const result = resolveMergerReducer(gameState, action);

    // Player should have received money for selling shares (3 * 200 = 600)
    assertEquals(result.players[0].money, INITIAL_PLAYER_MONEY + 600);

    // Player should have 2 shares left in merged hotel
    const sacksonHotel = result.hotels.find((h) => h.name === 'Sackson');
    const playerShares = sacksonHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerShares, 2);

    // Bank should have received the sold shares back
    const bankShares = sacksonHotel?.shares.filter((s) => s.location === 'bank').length;
    assertEquals(bankShares, 23); // 25 - 5 + 3 = 23 (started with 25, gave 5 to player, player sold 3 back)
  });

  await t.step('successfully resolves merger with only trading shares', () => {
    let gameState = createBasicGameState();

    // Give player 6 shares in merged hotel
    gameState.hotels = assignSharesToPlayer(gameState.hotels, 'Sackson', 0, 6);

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 0,
          trade: 6,
        },
      },
    };

    const result = resolveMergerReducer(gameState, action);

    // Player should have 3 shares in surviving hotel (6 / 2 = 3)
    const worldwideHotel = result.hotels.find((h) => h.name === 'Worldwide');
    const playerWorldwideShares = worldwideHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerWorldwideShares, 3);

    // Player should have 0 shares in merged hotel
    const sacksonHotel = result.hotels.find((h) => h.name === 'Sackson');
    const playerSacksonShares = sacksonHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerSacksonShares, 0);

    // Player money should be unchanged
    assertEquals(result.players[0].money, INITIAL_PLAYER_MONEY);
  });

  await t.step('successfully resolves merger with both selling and trading', () => {
    let gameState = createBasicGameState();

    // Give player 8 shares in merged hotel
    gameState.hotels = assignSharesToPlayer(gameState.hotels, 'Sackson', 0, 8);

    // Place tiles on board to establish hotel prices
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'Sackson' },
      { row: 3, col: 2, hotel: 'Sackson' },
    ]);

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 2,
          trade: 4,
        },
      },
    };

    const result = resolveMergerReducer(gameState, action);

    // Player should have received money for selling 2 shares (2 * 200 = 400)
    assertEquals(result.players[0].money, INITIAL_PLAYER_MONEY + 400);

    // Player should have 2 shares in surviving hotel (4 / 2 = 2)
    const worldwideHotel = result.hotels.find((h) => h.name === 'Worldwide');
    const playerWorldwideShares = worldwideHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerWorldwideShares, 2);

    // Player should have 2 shares left in merged hotel (8 - 2 - 4 = 2)
    const sacksonHotel = result.hotels.find((h) => h.name === 'Sackson');
    const playerSacksonShares = sacksonHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerSacksonShares, 2);
  });

  await t.step('moves to next stockholder when more stockholders remain', () => {
    let gameState = createBasicGameState({
      mergeContext: {
        survivingHotel: 'Worldwide',
        mergedHotel: 'Sackson',
        stockholderIds: [0, 1], // Two stockholders
        originalHotels: [],
        additionalTiles: [],
      },
    });

    // Give player shares
    gameState.hotels = assignSharesToPlayer(gameState.hotels, 'Sackson', 0, 4);

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 2,
          trade: 2,
        },
      },
    };

    const result = resolveMergerReducer(gameState, action);

    // Should still be in RESOLVE_MERGER phase
    assertEquals(result.currentPhase, GamePhase.RESOLVE_MERGER);

    // Should move to next stockholder
    assertEquals(result.mergeContext?.stockholderIds, [1]);
  });

  await t.step(
    'transitions to BUY_SHARES when all stockholders resolved and no more mergers',
    () => {
      let gameState = createBasicGameState({
        mergeContext: {
          survivingHotel: 'Worldwide',
          mergedHotel: 'Sackson',
          stockholderIds: [0], // Only one stockholder
          originalHotels: [], // No more mergers
          additionalTiles: [],
        },
      });

      // Give player shares
      gameState.hotels = assignSharesToPlayer(gameState.hotels, 'Sackson', 0, 4);

      const action = {
        type: ActionTypes.RESOLVE_MERGER,
        payload: {
          playerId: 0,
          shares: {
            sell: 2,
            trade: 2,
          },
        },
      };

      const result = resolveMergerReducer(gameState, action);

      // Should transition to BUY_SHARES phase
      assertEquals(result.currentPhase, GamePhase.BUY_SHARES);

      // Merge context should be cleared
      assertEquals(result.mergeContext, undefined);
    },
  );

  await t.step('preserves other game state properties', () => {
    let gameState = createBasicGameState({
      gameId: 'test-resolve-merger-123',
      owner: 'MergerResolver',
      currentTurn: 5,
      lastUpdated: 1234567890,
    });

    // Give player shares
    gameState.hotels = assignSharesToPlayer(gameState.hotels, 'Sackson', 0, 4);

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 2,
          trade: 2,
        },
      },
    };

    const result = resolveMergerReducer(gameState, action);

    // Check that other properties are preserved
    assertEquals(result.gameId, 'test-resolve-merger-123');
    assertEquals(result.owner, 'MergerResolver');
    assertEquals(result.currentTurn, 5);
    assertEquals(result.lastUpdated, 1234567890);
    assertEquals(result.error, null);
  });

  await t.step('handles resolution with no shares to sell or trade', () => {
    let gameState = createBasicGameState();

    // Give player shares but don't sell or trade any
    gameState.hotels = assignSharesToPlayer(gameState.hotels, 'Sackson', 0, 4);

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 0,
          trade: 0,
        },
      },
    };

    const result = resolveMergerReducer(gameState, action);

    // Player money should be unchanged
    assertEquals(result.players[0].money, INITIAL_PLAYER_MONEY);

    // Player should still have all shares in merged hotel
    const sacksonHotel = result.hotels.find((h) => h.name === 'Sackson');
    const playerShares = sacksonHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerShares, 4);

    // Should transition to BUY_SHARES (assuming no more stockholders)
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);
  });
});

Deno.test('resolveMergerReducer edge cases', async (t) => {
  await t.step('handles maximum trade scenario', () => {
    let gameState = createBasicGameState();

    // Give player many shares in merged hotel
    gameState.hotels = assignSharesToPlayer(gameState.hotels, 'Sackson', 0, 20);

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 0,
          trade: 20, // Trade all shares (would get 10 in surviving hotel)
        },
      },
    };

    const result = resolveMergerReducer(gameState, action);

    // Player should have 10 shares in surviving hotel
    const worldwideHotel = result.hotels.find((h) => h.name === 'Worldwide');
    const playerWorldwideShares = worldwideHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerWorldwideShares, 10);

    // Player should have 0 shares in merged hotel
    const sacksonHotel = result.hotels.find((h) => h.name === 'Sackson');
    const playerSacksonShares = sacksonHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerSacksonShares, 0);
  });

  await t.step('handles case where player has exactly the shares they want to trade/sell', () => {
    let gameState = createBasicGameState();

    // Give player exactly 6 shares
    gameState.hotels = assignSharesToPlayer(gameState.hotels, 'Sackson', 0, 6);

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 2,
          trade: 4, // Use all shares
        },
      },
    };

    const result = resolveMergerReducer(gameState, action);

    // Player should have 0 shares left in merged hotel
    const sacksonHotel = result.hotels.find((h) => h.name === 'Sackson');
    const playerShares = sacksonHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerShares, 0);

    // Player should have 2 shares in surviving hotel
    const worldwideHotel = result.hotels.find((h) => h.name === 'Worldwide');
    const playerWorldwideShares = worldwideHotel?.shares.filter((s) => s.location === 0).length;
    assertEquals(playerWorldwideShares, 2);
  });

  await t.step('handles different hotel types with different prices', () => {
    let gameState = createBasicGameState({
      mergeContext: {
        survivingHotel: 'Tower', // Luxury hotel
        mergedHotel: 'Sackson',
        stockholderIds: [0],
        originalHotels: [],
        additionalTiles: [],
      },
    });

    // Give player shares
    gameState.hotels = assignSharesToPlayer(gameState.hotels, 'Sackson', 0, 4);

    // Place tiles to establish prices
    gameState.tiles = placeTilesOnBoard(gameState.tiles, [
      { row: 3, col: 1, hotel: 'Sackson' },
      { row: 3, col: 2, hotel: 'Sackson' },
    ]);

    const action = {
      type: ActionTypes.RESOLVE_MERGER,
      payload: {
        playerId: 0,
        shares: {
          sell: 2,
          trade: 2,
        },
      },
    };

    const result = resolveMergerReducer(gameState, action);

    // Should work with different hotel types
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);

    // Player should have received money for selling
    assertEquals(result.players[0].money > INITIAL_PLAYER_MONEY, true);
  });
});
