import { assertEquals, assertThrows } from "jsr:@std/assert";
import { expect } from "jsr:@std/expect";
import { playTileReducer } from "./playTileReducer.ts";
import { GameError, GameErrorCodes, GamePhase, type GameState, type Hotel, type Tile, type Player, type HOTEL_NAME, type HOTEL_TYPE } from "@/engine/types/index.ts";
import { ActionTypes } from "@/engine/types/actionsTypes.ts";
import { INITIAL_PLAYER_MONEY, ROWS, COLS } from "@/engine/config/gameConfig.ts";
import { initializeTiles } from "@/engine/domain/tileOperations.ts";
import { buySharesReducer } from '@/engine/reducers/buySharesReducer.ts';

// Helper function to create a basic game state
function createBasicGameState(overrides: Partial<GameState> = {}): GameState {
  const defaultPlayer: Player = {
    id: 0,
    name: "TestPlayer",
    money: INITIAL_PLAYER_MONEY,
    shares: {},
    tiles: []
  };

  return {
    gameId: "test-game",
    owner: "TestPlayer",
    currentPhase: GamePhase.PLAY_TILE,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [defaultPlayer],
    hotels: [],
    tiles: initializeTiles(ROWS, COLS), // Use proper tile initialization
    error: null,
    lastActions: [],
    ...overrides
  };
}

// Helper function to create a hotel
function createHotel(name: HOTEL_NAME, tiles: Tile[] = [], shareCount = 25): Hotel {
  return {
    name,
    type: 'economy' as HOTEL_TYPE,
    tiles,
    shares: Array(shareCount).fill(null).map((_, i) => ({
      id: i,
      location: 'bank' as const
    }))
  };
}

// Helper function to create a player
function createPlayer(id: number, name: string): Player {
  return {
    id,
    name,
    money: INITIAL_PLAYER_MONEY,
    shares: {},
    tiles: []
  };
}

Deno.test("playTileReducer validation tests", async (t) => {
  await t.step("throws error when not player's turn", () => {
    const gameState = createBasicGameState({
      currentPlayer: 1 // Different from tile owner (player 0)
    });

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        playerId: 0,
        tile: { row: 5, col: 4, location: 0 }
      }
    };

    const error = assertThrows(
      () => playTileReducer(gameState, action),
      GameError,
      "Not your turn"
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step("throws error when not in PLAY_TILE phase", () => {
    const gameState = createBasicGameState({
      currentPhase: GamePhase.BUY_SHARES
    });

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        playerId: 0,
        tile: { row: 5, col: 4, location: 0 }
      }
    };

    const error = assertThrows(
      () => playTileReducer(gameState, action),
      GameError,
      "Invalid action"
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step("throws error when tile doesn't belong to player", () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        playerId: 0,
        tile: { row: 5, col: 4, location: 1 } // Belongs to player 1, not 0
      }
    };

    const error = assertThrows(
      () => playTileReducer(gameState, action),
      GameError,
      "Not your tile"
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });
});

Deno.test("playTileReducer simple placement tests", async (t) => {
  await t.step("handles simple tile placement with no adjacent tiles", () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        playerId: 0,
        tile: { row: 5, col: 4, location: 0 }
      }
    };

    const result = playTileReducer(gameState, action);

    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);
    assertEquals(result.tiles[5][4].location, 'board');
    assertEquals(result.tiles[5][4].row, 5);
    assertEquals(result.tiles[5][4].col, 4);
  });
});

Deno.test("playTileReducer hotel extension tests", async (t) => {
  await t.step("extends existing hotel when tile is adjacent", () => {
    const existingTile: Tile = { row: 5, col: 3, location: 'board' };
    const hotel = createHotel("Worldwide", [existingTile]);
    
    const gameState = createBasicGameState({
      hotels: [hotel]
    });
    
    // Place existing tile on board
    gameState.tiles[5][3] = existingTile;

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        playerId: 0,
        tile: { row: 5, col: 4, location: 0 } // Adjacent to existing hotel tile
      }
    };

    const result = playTileReducer(gameState, action);

    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);
    assertEquals(result.hotels[0].tiles.length, 2);
    assertEquals(result.hotels[0].tiles[1].row, 5);
    assertEquals(result.hotels[0].tiles[1].col, 4);
  });
});

Deno.test("playTileReducer hotel founding tests", async (t) => {
  await t.step("triggers hotel founding when adjacent to unaffiliated tiles", () => {
    const gameState = createBasicGameState({
      hotels: [createHotel("Worldwide")]
    });
    
    // Place an unaffiliated tile adjacent to where we'll play
    gameState.tiles[5][3] = { row: 5, col: 3, location: 'board' };

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        playerId: 0,
        tile: { row: 5, col: 4, location: 0 }
      }
    };

    const result = playTileReducer(gameState, action);

    assertEquals(result.currentPhase, GamePhase.FOUND_HOTEL);
    expect(result.foundHotelContext).toBeDefined();
    assertEquals(result.foundHotelContext!.availableHotels.length, 1);
    assertEquals(result.foundHotelContext!.tiles.length, 2); // Original tile + new tile
  });

  await t.step("does not trigger hotel founding when no hotels available", () => {
    // Create hotels with no available shares (all owned by player)
    const unavailableHotel = createHotel("Worldwide");
    unavailableHotel.shares.forEach(share => share.location = 0); // All owned by player

    const gameState = createBasicGameState({
      hotels: [unavailableHotel]
    });
    
    // Place an unaffiliated tile adjacent to where we'll play
    gameState.tiles[5][3] = { row: 5, col: 3, location: 'board' };

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        playerId: 0,
        tile: { row: 5, col: 4, location: 0 }
      }
    };

    const result = playTileReducer(gameState, action);

    // Should fall back to simple placement
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);
  });
});

Deno.test("playTileReducer merger tests", async (t) => {
  await t.step("triggers merger when adjacent to multiple hotels", () => {
    const hotel1Tile: Tile = { row: 5, col: 3, location: 'board' };
    const hotel1Tile2: Tile = { row: 4, col: 3, location: 'board' };
    const hotel2Tile: Tile = { row: 6, col: 4, location: 'board' };
    
    const hotel1 = createHotel("Worldwide", [hotel1Tile, hotel1Tile2]);
    const hotel2 = createHotel("Sackson", [hotel2Tile]);
    
    const gameState = createBasicGameState({
      hotels: [hotel1, hotel2]
    });
    
    // Place hotel tiles on board
    gameState.tiles[5][3] = hotel1Tile;
    gameState.tiles[6][4] = hotel2Tile;

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        playerId: 0,
        tile: { row: 5, col: 4, location: 0 }, // Adjacent to both hotels
        resolvedTies: []
      }
    };

    const result = playTileReducer(gameState, action);

    // Should trigger merger resolution
    assertEquals(result.currentPhase, GamePhase.RESOLVE_MERGER);
    expect(result.mergerContext).toBeDefined();
  });

  await t.step("triggers merger tie breaking when hotels are same size", () => {
    // Create two hotels of equal size
    const hotel1Tiles: Tile[] = [
      { row: 5, col: 2, location: 'board' },
      { row: 5, col: 3, location: 'board' }
    ];
    const hotel2Tiles: Tile[] = [
      { row: 6, col: 4, location: 'board' },
      { row: 7, col: 4, location: 'board' }
    ];
    
    const hotel1 = createHotel("Worldwide", hotel1Tiles);
    const hotel2 = createHotel("Sackson", hotel2Tiles);
    
    const gameState = createBasicGameState({
      hotels: [hotel1, hotel2]
    });
    
    // Place hotel tiles on board
    hotel1Tiles.forEach(tile => gameState.tiles[tile.row][tile.col] = tile);
    hotel2Tiles.forEach(tile => gameState.tiles[tile.row][tile.col] = tile);

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        playerId: 0,
        tile: { row: 5, col: 4, location: 0 } // Adjacent to both hotels
      }
    };

    const result = playTileReducer(gameState, action);

    // Should trigger tie breaking
    assertEquals(result.currentPhase, GamePhase.BREAK_MERGER_TIE);
    expect(result.mergerTieContext).toBeDefined();
    assertEquals(result.mergerTieContext!.breakTie.length, 2);
  });
});

Deno.test("playTileReducer state management tests", async (t) => {
  await t.step("clears merger contexts after buying stocks", () => {
    const gameState = createBasicGameState({
      currentPhase: GamePhase.BUY_SHARES,
      hotels: [createHotel("Worldwide", [], 25)],
      mergerContext: {
        survivingHotel: createHotel("Worldwide"),
        mergedHotels: [createHotel("Sackson")]
      },
      mergerTieContext: {
        breakTie: ["Worldwide", "Sackson"]
      }
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 0,
        shares: { Worldwide: 1 }
      }
    };

    const result = buySharesReducer(gameState, action);

    assertEquals(result.mergerContext, undefined);
    assertEquals(result.mergerTieContext, undefined);
  });

  await t.step("updates tile location to board", () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.PLAY_TILE,
      payload: {
        playerId: 0,
        tile: { row: 5, col: 4, location: 0 }
      }
    };

    const result = playTileReducer(gameState, action);

    assertEquals(result.tiles[5][4].location, 'board');
  });
});

// Deno.test("playTileReducer state transition tests", async (t) => {
//   await t.step("successfully transitions to PLAY_TILE phase", () => {
//     const player = createPlayer(0, "Player1");
//     player.tiles = [
//       { row: 1, col: 1, location: 0 },
//       { row: 2, col: 2, location: 0 },
//       { row: 3, col: 3, location: 0 },
//       { row: 4, col: 4, location: 0 },
//       { row: 5, col: 5, location: 0 },
//       { row: 6, col: 6, location: 0 }
//     ];

//     const gameState = createBasicGameState({
//       currentPhase: GamePhase.PLAY_TILE,
//       players: [player]
//     });

//     const action = {
//       type: ActionTypes.PLAY_TILE,
//       payload: {
//         playerId: 0
//       }
//     };

//     const result = playTileReducer(gameState, action);

//     assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
//     assertEquals(result.players[0].tiles.length, 6);
    
//     // All tiles should still belong to the player
//     result.players[0].tiles.forEach(tile => {
//       expect(tile).toBeDefined();
//       assertEquals(tile.location, 0);
//     });
//   });

//   await t.step("replaces dead tiles with new ones", () => {
//     const player = createPlayer(0, "Player1");
    
//     // Create a game state where some tiles would be considered "dead"
//     // This would require setting up hotels and board state to make tiles unplayable
//     const gameState = createBasicGameState({
//       currentPhase: GamePhase.PLAY_TILE,
//       players: [player],
//       // Add some hotels and board state that would make certain tiles dead
//       hotels: []
//     });

//     // Give player some tiles
//     player.tiles = [
//       { row: 1, col: 1, location: 0 },
//       { row: 2, col: 2, location: 0 },
//       { row: 3, col: 3, location: 0 },
//       { row: 4, col: 4, location: 0 },
//       { row: 5, col: 5, location: 0 },
//       { row: 6, col: 6, location: 0 }
//     ];

//     const action = {
//       type: ActionTypes.PLAY_TILE,
//       payload: {
//         playerId: 0
//       }
//     };

//     const result = playTileReducer(gameState, action);

//     assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
    
//     // Player should still have tiles (dead tile replacement logic would be tested separately)
//     expect(result.players[0].tiles.length).toBeGreaterThan(0);
    
//     // All remaining tiles should be defined and belong to the player
//     result.players[0].tiles.forEach(tile => {
//       expect(tile).toBeDefined();
//       assertEquals(tile.location, 0);
//     });
//   });

//   await t.step("handles player with no tiles gracefully", () => {
//     const player = createPlayer(0, "Player1");
//     player.tiles = []; // No tiles

//     const gameState = createBasicGameState({
//       currentPhase: GamePhase.PLAY_TILE,
//       players: [player]
//     });

//     const action = {
//       type: ActionTypes.PLAY_TILE,
//       payload: {
//         playerId: 0
//       }
//     };

//     const result = playTileReducer(gameState, action);

//     assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
//     assertEquals(result.players[0].tiles.length, 0);
//   });

//   await t.step("only affects the specified player", () => {
//     const player1 = createPlayer(0, "Player1");
//     const player2 = createPlayer(1, "Player2");
    
//     player1.tiles = [{ row: 1, col: 1, location: 0 }];
//     player2.tiles = [{ row: 2, col: 2, location: 1 }];

//     const gameState = createBasicGameState({
//       currentPhase: GamePhase.PLAY_TILE,
//       players: [player1, player2]
//     });

//     const action = {
//       type: ActionTypes.PLAY_TILE,
//       payload: {
//         playerId: 0 // Only affecting player 0
//       }
//     };

//     const result = playTileReducer(gameState, action);

//     // Player 1 should be unchanged
//     assertEquals(result.players[1].tiles.length, 1);
//     assertEquals(result.players[1].tiles[0].row, 2);
//     assertEquals(result.players[1].tiles[0].col, 2);
//     assertEquals(result.players[1].tiles[0].location, 1);
//   });
// });

