import { assertEquals, assertThrows } from "jsr:@std/assert";
import { expect } from "jsr:@std/expect";
import { buySharesReducer } from "./buySharesReducer.ts";
import { GameError, GameErrorCodes, GamePhase, type GameState, type Hotel, type Player, type HOTEL_NAME, type HOTEL_TYPE } from "@/engine/types/index.ts";
import { ActionTypes } from "@/engine/types/actionsTypes.ts";
import { INITIAL_PLAYER_MONEY } from "@/engine/config/gameConfig.ts";

// Helper function to create a basic game state
function createBasicGameState(overrides: Partial<GameState> = {}): GameState {
  const defaultPlayer: Player = {
    id: 0,
    name: "TestPlayer",
    money: INITIAL_PLAYER_MONEY,
    shares: {},
    tiles: []
  };

  const secondPlayer: Player = {
    id: 1,
    name: "Player2",
    money: INITIAL_PLAYER_MONEY,
    shares: {},
    tiles: []
  };

  return {
    gameId: "test-game",
    owner: "TestPlayer",
    currentPhase: GamePhase.BUY_SHARES,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [defaultPlayer, secondPlayer],
    hotels: [],
    tiles: Array(12).fill(null).map(() => Array(9).fill(null)),
    error: null,
    lastActions: [],
    ...overrides
  };
}

// Helper function to create a hotel
function createHotel(name: HOTEL_NAME, tileCount = 5, shareCount = 25): Hotel {
  return {
    name,
    type: 'economy' as HOTEL_TYPE,
    tiles: Array(tileCount).fill(null).map((_, i) => ({
      row: i,
      col: 0,
      location: 'board' as const
    })),
    shares: Array(shareCount).fill(null).map((_, i) => ({
      id: i,
      location: 'bank' as const
    }))
  };
}

Deno.test("buySharesReducer validation tests", async (t) => {
  await t.step("throws error when not player's turn", () => {
    const gameState = createBasicGameState({
      currentPlayer: 1 // Different from action player (0)
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 0,
        shares: { "Worldwide": 1, "Sackson": 0, "Festival": 0, "Imperial": 0, "American": 0, "Continental": 0, "Tower": 0 }
      }
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError,
      "Not your turn"
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step("throws error when not in BUY_SHARES phase", () => {
    const gameState = createBasicGameState({
      currentPhase: GamePhase.PLAY_TILE
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 0,
        shares: { "Worldwide": 1, "Sackson": 0, "Festival": 0, "Imperial": 0, "American": 0, "Continental": 0, "Tower": 0 }
      }
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError,
      "Invalid action"
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step("throws error when trying to buy more than 3 shares", () => {
    const hotel = createHotel("Worldwide");
    const gameState = createBasicGameState({
      hotels: [hotel]
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 0,
        shares: { "Worldwide": 4, "Sackson": 0, "Festival": 0, "Imperial": 0, "American": 0, "Continental": 0, "Tower": 0 } // More than 3 shares
      }
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError,
      "Only 3 shares may be purchased per turn"
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step("throws error when trying to buy shares across multiple hotels totaling more than 3", () => {
    const hotel1 = createHotel("Worldwide");
    const hotel2 = createHotel("Sackson");
    const gameState = createBasicGameState({
      hotels: [hotel1, hotel2]
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 0,
        shares: { "Worldwide": 2, "Sackson": 2, "Festival": 0, "Imperial": 0, "American": 0, "Continental": 0, "Tower": 0 } // Total 4 shares
      }
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError,
      "Only 3 shares may be purchased per turn"
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step("throws error when hotel doesn't exist", () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 0,
        shares: { "Worldwide": 1, "Sackson": 0, "Festival": 0, "Imperial": 0, "American": 0, "Continental": 0, "Tower": 0 } // Hotel doesn't exist
      }
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError,
      "Hotel Worldwide doesn't exist"
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step("throws error when hotel doesn't have enough shares", () => {
    const hotel = createHotel("Worldwide", 5, 2); // Only 2 shares available
    const gameState = createBasicGameState({
      hotels: [hotel]
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 0,
        shares: { "Worldwide": 3, "Sackson": 0, "Festival": 0, "Imperial": 0, "American": 0, "Continental": 0, "Tower": 0 } // Trying to buy 3 when only 2 available
      }
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError,
      "Hotel Worldwide doesn't have enough shares"
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step("throws error when player doesn't have enough money", () => {
    const hotel = createHotel("Worldwide", 5); // 5 tiles = $500 per share for economy hotel
    const gameState = createBasicGameState({
      hotels: [hotel],
      players: [{
        id: 0,
        name: "TestPlayer",
        money: 100, // Not enough for even 1 share at $500
        shares: {},
        tiles: []
      }, {
        id: 1,
        name: "Player2",
        money: INITIAL_PLAYER_MONEY,
        shares: {},
        tiles: []
      }]
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 0,
        shares: { "Worldwide": 1 }
      }
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
    expect(error.message).toContain("You need $500 to purchase these shares and you only have $100");
  });
});

Deno.test("buySharesReducer successful purchase tests", async (t) => {
  await t.step("successfully buys single share", () => {
    const hotel = createHotel("Worldwide", 5); // 5 tiles = $500 per share
    const gameState = createBasicGameState({
      hotels: [hotel]
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 0,
        shares: { "Worldwide": 1 }
      }
    };

    const result = buySharesReducer(gameState, action);

    // Check phase transition
    assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
    assertEquals(result.currentPlayer, 1); // Next player
    assertEquals(result.currentTurn, 1); // Same turn since not back to player 0

    // Check player money deduction
    assertEquals(result.players[0].money, INITIAL_PLAYER_MONEY - 500);

    // Check share ownership
    assertEquals(result.hotels[0].shares[0].location, 0); // First share owned by player 0
    assertEquals(result.hotels[0].shares[1].location, 'bank'); // Second share still in bank
  });

  await t.step("successfully buys multiple shares from same hotel", () => {
    const hotel = createHotel("Worldwide", 5); // 5 tiles = $500 per share
    const gameState = createBasicGameState({
      hotels: [hotel]
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 0,
        shares: { "Worldwide": 3 }
      }
    };

    const result = buySharesReducer(gameState, action);

    // Check player money deduction (3 * $500 = $1500)
    assertEquals(result.players[0].money, INITIAL_PLAYER_MONEY - 1500);

    // Check share ownership
    assertEquals(result.hotels[0].shares[0].location, 0);
    assertEquals(result.hotels[0].shares[1].location, 0);
    assertEquals(result.hotels[0].shares[2].location, 0);
    assertEquals(result.hotels[0].shares[3].location, 'bank');
  });

  await t.step("successfully buys shares from multiple hotels", () => {
    const hotel1 = createHotel("Worldwide", 5); // $500 per share
    const hotel2 = createHotel("Sackson", 3); // $300 per share
    const gameState = createBasicGameState({
      hotels: [hotel1, hotel2]
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 0,
        shares: { "Worldwide": 2, "Sackson": 1 } // 2*$500 + 1*$300 = $1300
      }
    };

    const result = buySharesReducer(gameState, action);

    // Check player money deduction
    assertEquals(result.players[0].money, INITIAL_PLAYER_MONEY - 1300);

    // Check share ownership for hotel1
    assertEquals(result.hotels[0].shares[0].location, 0);
    assertEquals(result.hotels[0].shares[1].location, 0);
    assertEquals(result.hotels[0].shares[2].location, 'bank');

    // Check share ownership for hotel2
    assertEquals(result.hotels[1].shares[0].location, 0);
    assertEquals(result.hotels[1].shares[1].location, 'bank');
  });

  await t.step("successfully buys no shares (empty purchase)", () => {
    const hotel = createHotel("Worldwide", 5);
    const gameState = createBasicGameState({
      hotels: [hotel]
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 0,
        shares: { "Worldwide": 0 } // No shares purchased
      }
    };

    const error = assertThrows(
      () => buySharesReducer(gameState, action),
      GameError
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
    expect(error.message).toContain("Can't buy zero shares in hotel Worldwide");
  });
});

Deno.test("buySharesReducer turn management tests", async (t) => {
  await t.step("advances to next player correctly", () => {
    const hotel = createHotel("Worldwide", 5);
    const gameState = createBasicGameState({
      hotels: [hotel],
      currentPlayer: 0
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 0,
        shares: { "Worldwide": 1 }
      }
    };

    const result = buySharesReducer(gameState, action);

    assertEquals(result.currentPlayer, 1);
    assertEquals(result.currentTurn, 1); // Same turn
  });

  await t.step("wraps around to first player and increments turn", () => {
    const hotel = createHotel("Worldwide", 5);
    const gameState = createBasicGameState({
      hotels: [hotel],
      currentPlayer: 1, // Last player
      players: [
        { id: 0, name: "Player1", money: INITIAL_PLAYER_MONEY, shares: {}, tiles: [] },
        { id: 1, name: "Player2", money: INITIAL_PLAYER_MONEY, shares: {}, tiles: [] }
      ]
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 1,
        shares: { "Worldwide": 1 }
      }
    };

    const result = buySharesReducer(gameState, action);

    assertEquals(result.currentPlayer, 0); // Back to first player
    assertEquals(result.currentTurn, 2); // Turn incremented
  });
});

Deno.test("buySharesReducer edge cases", async (t) => {
  await t.step("handles hotel with some shares already owned", () => {
    const hotel = createHotel("Worldwide", 5);
    // Mark first 2 shares as already owned by player 1
    hotel.shares[0].location = 1;
    hotel.shares[1].location = 1;

    const gameState = createBasicGameState({
      hotels: [hotel]
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 0,
        shares: { "Worldwide": 2 }
      }
    };

    const result = buySharesReducer(gameState, action);

    // Check that player 0 gets the next available shares (indices 2 and 3)
    assertEquals(result.hotels[0].shares[0].location, 1); // Still owned by player 1
    assertEquals(result.hotels[0].shares[1].location, 1); // Still owned by player 1
    assertEquals(result.hotels[0].shares[2].location, 0); // Now owned by player 0
    assertEquals(result.hotels[0].shares[3].location, 0); // Now owned by player 0
    assertEquals(result.hotels[0].shares[4].location, 'bank'); // Still in bank
  });
});
