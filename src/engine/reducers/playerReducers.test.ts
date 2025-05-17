import { assertEquals } from "jsr:@std/assert";
import { expect } from "jsr:@std/expect";
import { addPlayerReducer } from "./playerReducers.ts";
import { GameErrorCodes, GamePhase } from "@/engine/types/index.ts";
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
        currentPhase: GamePhase.WAITING_FOR_PLAYERS,
        currentTurn: 0,
        currentPlayer: "",
        lastUpdated: Date.now(),
        players: [],
        hotels: [],
        tiles: [],
      };
      const playerName = "TestPlayer";

      // Act
      const result = addPlayerReducer(gameState, {
        type: "ADD_PLAYER",
        payload: { playerName },
      });

      // Assert
      assertEquals(result.success, true);
      expect(result.newState).toBeDefined();

      if (result.newState) {
        const newPlayers = result.newState.players;
        assertEquals(newPlayers.length, 1);
        assertEquals(newPlayers[0].name, playerName);
        assertEquals(newPlayers[0].money, INITIAL_PLAYER_MONEY);
      }
    },
  );

  await t.step(
    "fails to add a player when not in WAITING_FOR_PLAYERS phase",
    () => {
      // Arrange
      const gameState = {
        gameId: "test-game",
        currentPhase: GamePhase.PLAY_TILE, // Not in WAITING_FOR_PLAYERS phase
        currentTurn: 1,
        currentPlayer: "ExistingPlayer",
        lastUpdated: Date.now(),
        players: [{ name: "ExistingPlayer", money: INITIAL_PLAYER_MONEY }],
        hotels: [],
        tiles: [],
      };

      // Act
      const result = addPlayerReducer(gameState, {
        type: "ADD_PLAYER",
        payload: { playerName: "bob" },
      });

      // Assert
      assertEquals(result.success, false);
      assertEquals(result.error?.code, GameErrorCodes.NOT_ADDING_PLAYERS);
      assertEquals(
        result.error?.message,
        "Can't add players, game already in progress",
      );
      expect(result.newState).toBeUndefined();
    },
  );

  await t.step("fails to add a player when maximum players reached", () => {
    // Arrange
    const gameState = {
      gameId: "test-game",
      currentPhase: GamePhase.WAITING_FOR_PLAYERS,
      currentTurn: 0,
      currentPlayer: "",
      lastUpdated: Date.now(),
      players: Array(MAX_PLAYERS).fill(0).map((_, i) => ({
        name: `Player${i + 1}`,
        money: INITIAL_PLAYER_MONEY,
      })),
      hotels: [],
      tiles: [],
    };

    // Act
    const result = addPlayerReducer(gameState, {
      type: "ADD_PLAYER",
      payload: { playerName: "bob" },
    });

    // Assert
    assertEquals(result.success, false);
    assertEquals(result.error?.code, GameErrorCodes.PLAYERS_MAX);
    assertEquals(
      result.error?.message,
      `Game already has maximum of ${MAX_PLAYERS} players`,
    );
    expect(result.newState).toBeUndefined();
  });

  await t.step("fails to add a player with an empty name", () => {
    // Arrange
    const gameState = {
      gameId: "test-game",
      currentPhase: GamePhase.WAITING_FOR_PLAYERS,
      currentTurn: 0,
      currentPlayer: "",
      lastUpdated: Date.now(),
      players: [],
      hotels: [],
      tiles: [],
    };

    // Act
    const result = addPlayerReducer(gameState, {
      type: "ADD_PLAYER",
      payload: { playerName: "" },
    });

    // Assert
    assertEquals(result.success, false);
    assertEquals(result.error?.code, GameErrorCodes.INVALID_PLAYER_NAME);
    assertEquals(result.error?.message, "Player name cannot be empty");
    expect(result.newState).toBeUndefined();
  });

  await t.step("fails to add a player with a name longer than 20 characters", () => {
    // Arrange
    const gameState = {
      gameId: "test-game",
      currentPhase: GamePhase.WAITING_FOR_PLAYERS,
      currentTurn: 0,
      currentPlayer: "",
      lastUpdated: Date.now(),
      players: [],
      hotels: [],
      tiles: [],
    };

    // Act
    const result = addPlayerReducer(gameState, {
      type: "ADD_PLAYER",
      payload: { playerName: "ThisNameIsWayTooLongForTheGame" },
    });

    // Assert
    assertEquals(result.success, false);
    assertEquals(result.error?.code, GameErrorCodes.INVALID_PLAYER_NAME);
    assertEquals(result.error?.message, "Player name must be less than 20 characters");
    expect(result.newState).toBeUndefined();
  });

  await t.step("fails to add a player with a name that already exists", () => {
    // Arrange
    const existingPlayerName = "ExistingPlayer";
    const gameState = {
      gameId: "test-game",
      currentPhase: GamePhase.WAITING_FOR_PLAYERS,
      currentTurn: 0,
      currentPlayer: "",
      lastUpdated: Date.now(),
      players: [{ name: existingPlayerName, money: INITIAL_PLAYER_MONEY }],
      hotels: [],
      tiles: [],
    };

    // Act
    const result = addPlayerReducer(gameState, {
      type: "ADD_PLAYER",
      payload: { playerName: existingPlayerName },
    });

    // Assert
    assertEquals(result.success, false);
    assertEquals(result.error?.code, GameErrorCodes.PLAYER_EXISTS);
    assertEquals(result.error?.message, "A player with this name already exists");
    expect(result.newState).toBeUndefined();
  });
});
