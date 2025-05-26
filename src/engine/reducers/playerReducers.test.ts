import { assertEquals, assertThrows } from "jsr:@std/assert";
import { expect } from "jsr:@std/expect";
import { addPlayerReducer, removePlayerReducer } from "./playerReducers.ts";
import { GameErrorCodes, GamePhase } from "@/engine/types/index.ts";
import { GameError } from "@/engine/types/errorCodes.ts";
import {
  INITIAL_PLAYER_MONEY,
  MAX_PLAYERS,
} from "@/engine/config/gameConfig.ts";

Deno.test("addPlayerReducer tests", async (t) => {
  await t.step(
    "successfully adds a player when in WAITING_FOR_PLAYERS phase",
    () => {
      // Arrange
      const gameState = {
        gameId: "test-game",
        owner: "",
        currentPhase: GamePhase.WAITING_FOR_PLAYERS,
        currentTurn: 0,
        currentPlayer: 0,
        lastUpdated: Date.now(),
        players: [],
        hotels: [],
        tiles: [],
        error: null,
        lastActions: []
      };
      const playerName = "TestPlayer";

      // Act
      const newState = addPlayerReducer(gameState, {
        type: "ADD_PLAYER",
        payload: { playerName },
      });

      // Assert
      assertEquals(newState.players.length, 1);
      assertEquals(newState.players[0].name, playerName);
      assertEquals(newState.players[0].money, INITIAL_PLAYER_MONEY);
      expect(newState.players[0].shares).toBeDefined();
      assertEquals(Object.keys(newState.players[0].shares).length, 0);
    },
  );

  await t.step(
    "fails to add a player when not in WAITING_FOR_PLAYERS phase",
    () => {
      // Arrange
      const gameState = {
        gameId: "test-game",
        owner: "ExistingPlayer",
        currentPhase: GamePhase.PLAY_TILE, // Not in WAITING_FOR_PLAYERS phase
        currentTurn: 1,
        currentPlayer: 0,
        lastUpdated: Date.now(),
        players: [{ 
          id: 0,
          name: "ExistingPlayer", 
          money: INITIAL_PLAYER_MONEY,
          shares: {},
          tiles: []
        }],
        hotels: [],
        tiles: [],
        error: null,
        lastActions: []
      };

      // Act & Assert
      const error = assertThrows(
        () => {
          addPlayerReducer(gameState, {
            type: "ADD_PLAYER",
            payload: { playerName: "bob" },
          });
        },
        GameError,
        "Can't add player, game already in progress"
      );
      
      assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
    },
  );

  await t.step("fails to add a player when maximum players reached", () => {
    // Arrange
    const gameState = {
      gameId: "test-game",
      owner: "Player1",
      currentPhase: GamePhase.WAITING_FOR_PLAYERS,
      currentTurn: 0,
      currentPlayer: 0,
      lastUpdated: Date.now(),
      players: Array(MAX_PLAYERS).fill(0).map((_, i) => ({
        name: `Player${i + 1}`,
        id: i,
        money: INITIAL_PLAYER_MONEY,
        shares: {},
        tiles: []
      })),
      hotels: [],
      tiles: [],
      error: null,
      lastActions: []
    };

    // Act & Assert
    const error = assertThrows(
      () => {
        addPlayerReducer(gameState, {
          type: "ADD_PLAYER",
          payload: { playerName: "bob" },
        });
      },
      GameError,
      `Game already has maximum of ${MAX_PLAYERS} players`
    );
    
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step("fails to add a player with an empty name", () => {
    // Arrange
    const gameState = {
      gameId: "test-game",
      owner: "",
      currentPhase: GamePhase.WAITING_FOR_PLAYERS,
      currentTurn: 0,
      currentPlayer: 0,
      lastUpdated: Date.now(),
      players: [],
      hotels: [],
      tiles: [],
      error: null,
        lastActions: []
    };

    // Act & Assert
    const error = assertThrows(
      () => {
        addPlayerReducer(gameState, {
          type: "ADD_PLAYER",
          payload: { playerName: "" },
        });
      },
      GameError,
      "Player name cannot be empty"
    );
    
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step("fails to add a player with a name longer than 20 characters", () => {
    // Arrange
    const gameState = {
      gameId: "test-game",
      owner: "",
      currentPhase: GamePhase.WAITING_FOR_PLAYERS,
      currentTurn: 0,
      currentPlayer: 0,
      lastUpdated: Date.now(),
      players: [],
      hotels: [],
      tiles: [],
      error: null,
        lastActions: []
    };

    // Act & Assert
    const error = assertThrows(
      () => {
        addPlayerReducer(gameState, {
          type: "ADD_PLAYER",
          payload: { playerName: "ThisNameIsWayTooLongForTheGame" },
        });
      },
      GameError,
      "Player name must be less than 20 characters"
    );
    
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step("fails to add a player with a name that already exists", () => {
    // Arrange
    const existingPlayerName = "ExistingPlayer";
    const gameState = {
      gameId: "test-game",
      owner: existingPlayerName,
      currentPhase: GamePhase.WAITING_FOR_PLAYERS,
      currentTurn: 0,
      currentPlayer: 0,
      lastUpdated: Date.now(),
      players: [{ 
        id: 0,
        name: existingPlayerName, 
        money: INITIAL_PLAYER_MONEY,
        shares: {},
        tiles: []
      }],
      hotels: [],
      tiles: [],
      error: null,
        lastActions: []
    };

    // Act & Assert
    const error = assertThrows(
      () => {
        addPlayerReducer(gameState, {
          type: "ADD_PLAYER",
          payload: { playerName: existingPlayerName },
        });
      },
      GameError,
      "A player with this name already exists"
    );
    
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });
});

Deno.test("removePlayerReducer tests", async (t) => {
  await t.step("returns the game state unchanged", () => {
    // Arrange
    const gameState = {
      gameId: "test-game",
      owner: "Player1",
      currentPhase: GamePhase.WAITING_FOR_PLAYERS,
      currentTurn: 0,
      currentPlayer: 0,
      lastUpdated: Date.now(),
      players: [{ 
        id: 0,
        name: "Player1", 
        money: INITIAL_PLAYER_MONEY,
        shares: {},
        tiles: []
      }],
      hotels: [],
      tiles: [],
      error: null,
        lastActions: []
    };

    // Act
    const newState = removePlayerReducer(gameState, {
      type: "REMOVE_PLAYER",
      payload: { playerName: "Player1" },
    });

    // Assert
    assertEquals(newState, gameState);
  });
});
