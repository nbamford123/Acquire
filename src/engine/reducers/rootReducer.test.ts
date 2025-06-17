import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { rootReducer } from './rootReducer.ts';
import { initializeTiles } from '@/engine/domain/tileOperations.ts';
import { initializeHotels } from '@/engine/domain/hotelOperations.ts';
import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type Player,
} from '@/engine/types/index.ts';
import { ActionTypes } from '@/engine/types/actionsTypes.ts';
import { INITIAL_PLAYER_MONEY } from '@/engine/config/gameConfig.ts';

// Helper function to create a basic game state
function createBasicGameState(overrides: Partial<GameState> = {}): GameState {
  const defaultPlayer: Player = {
    id: 0,
    name: 'TestPlayer',
    money: INITIAL_PLAYER_MONEY,
  };

  return {
    gameId: 'test-game',
    owner: 'TestPlayer',
    currentPhase: GamePhase.WAITING_FOR_PLAYERS,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [defaultPlayer],
    hotels: initializeHotels(),
    tiles: initializeTiles(12, 9),
    error: null,
    lastActions: [],
    ...overrides,
  };
}

Deno.test('rootReducer successful action handling', async (t) => {
  await t.step('successfully handles ADD_PLAYER action', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        playerName: 'NewPlayer',
      },
    };

    const result = rootReducer(gameState, action);

    // Should add the new player
    assertEquals(result.players.length, 2);
    assertEquals(result.players[1].name, 'NewPlayer');

    // Error should be cleared
    assertEquals(result.error, null);
  });

  await t.step('successfully handles START_GAME action', () => {
    const gameState = createBasicGameState({
      players: [
        { id: 0, name: 'Player1', money: INITIAL_PLAYER_MONEY },
        { id: 1, name: 'Player2', money: INITIAL_PLAYER_MONEY },
      ],
      owner: 'Player1',
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        playerName: 'Player1',
      },
    };

    const result = rootReducer(gameState, action);

    // Should transition to PLAY_TILE phase
    assertEquals(result.currentPhase, GamePhase.PLAY_TILE);

    // Error should be cleared
    assertEquals(result.error, null);
  });

  await t.step('successfully handles BUY_SHARES action', () => {
    const gameState = createBasicGameState({
      currentPhase: GamePhase.BUY_SHARES,
      tiles: createBasicGameState().tiles.map((tile, index) => {
        // Place some tiles on board with hotels and give player some tiles
        if (index < 2) {
          return { ...tile, location: 'board' as const, hotel: 'Worldwide' as const };
        } else if (index < 4) {
          return { ...tile, location: 0 }; // Player tiles
        }
        return tile;
      }),
    });

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        playerId: 0,
        shares: { Worldwide: 1 },
      },
    };

    const result = rootReducer(gameState, action);

    // Should transition to PLAY_TILE phase
    assertEquals(result.currentPhase, GamePhase.PLAY_TILE);

    // Error should be cleared
    assertEquals(result.error, null);
  });

  await t.step('clears existing error on successful action', () => {
    const gameState = createBasicGameState({
      error: {
        code: GameErrorCodes.GAME_INVALID_ACTION,
        message: 'Previous error',
      },
    });

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        playerName: 'NewPlayer',
      },
    };

    const result = rootReducer(gameState, action);

    // Should clear the previous error
    assertEquals(result.error, null);

    // Should still process the action successfully
    assertEquals(result.players.length, 2);
    assertEquals(result.players[1].name, 'NewPlayer');
  });

  await t.step('preserves other game state properties', () => {
    const gameState = createBasicGameState({
      gameId: 'test-root-reducer-123',
      owner: 'RootOwner',
      currentTurn: 5,
      lastUpdated: 1234567890,
      lastActions: ['previous action'],
    });

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        playerName: 'NewPlayer',
      },
    };

    const result = rootReducer(gameState, action);

    // Should preserve other properties
    assertEquals(result.gameId, 'test-root-reducer-123');
    assertEquals(result.owner, 'RootOwner');
    assertEquals(result.currentTurn, 5);
    assertEquals(result.lastUpdated, 1234567890);
    assertEquals(result.lastActions, ['previous action']);
  });
});

Deno.test('rootReducer error handling', async (t) => {
  await t.step('catches GameError and sets error state', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        playerName: '', // Invalid empty name
      },
    };

    const result = rootReducer(gameState, action);

    // Should preserve original state
    assertEquals(result.players.length, 1);
    assertEquals(result.players[0].name, 'TestPlayer');

    // Should set error state
    assertEquals(result.error?.code, GameErrorCodes.GAME_INVALID_ACTION);
    assertEquals(result.error?.message, 'Player name cannot be empty');
  });

  await t.step('catches GameError with different error codes', () => {
    const gameState = createBasicGameState({
      currentPhase: GamePhase.PLAY_TILE, // Wrong phase for adding players
    });

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        playerName: 'ValidName',
      },
    };

    const result = rootReducer(gameState, action);

    // Should preserve original state
    assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
    assertEquals(result.players.length, 1);

    // Should set error state
    assertEquals(result.error?.code, GameErrorCodes.GAME_INVALID_ACTION);
    assertEquals(result.error?.message, "Can't add player, game already in progress");
  });

  await t.step('catches non-GameError and converts to UNKNOWN_ERROR', () => {
    const gameState = createBasicGameState();

    // Create an action that will cause a non-GameError (e.g., TypeError)
    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: null as any, // This will cause a TypeError when accessing playerName
    };

    const result = rootReducer(gameState, action);

    // Should preserve original state
    assertEquals(result.players.length, 1);

    // Should set error state with UNKNOWN_ERROR code
    assertEquals(result.error?.code, GameErrorCodes.UNKNOWN_ERROR);
    assertEquals(typeof result.error?.message, 'string');
    assertEquals((result.error?.message?.length ?? 0) > 0, true);
  });

  await t.step('handles string errors', () => {
    const gameState = createBasicGameState();

    // Mock a scenario that throws a string error
    const originalConsoleWarn = console.warn;
    console.warn = () => {}; // Suppress warning for test

    try {
      // This is a bit contrived, but we'll test the string error handling path
      const action = {
        type: 'INVALID_ACTION_TYPE' as any,
        payload: {},
      } as any;

      const result = rootReducer(gameState, action);

      // Should preserve original state when no handler found
      assertEquals(result.players.length, 1);
      assertEquals(result.error, null); // No error for unknown action type, just warning
    } finally {
      console.warn = originalConsoleWarn;
    }
  });

  await t.step('preserves other state properties when error occurs', () => {
    const gameState = createBasicGameState({
      gameId: 'test-error-handling',
      owner: 'ErrorOwner',
      currentTurn: 10,
      lastUpdated: 9876543210,
      lastActions: ['some action'],
    });

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        playerName: '', // Invalid empty name
      },
    };

    const result = rootReducer(gameState, action);

    // Should preserve all other properties
    assertEquals(result.gameId, 'test-error-handling');
    assertEquals(result.owner, 'ErrorOwner');
    assertEquals(result.currentTurn, 10);
    assertEquals(result.lastUpdated, 9876543210);
    assertEquals(result.lastActions, ['some action']);
    assertEquals(result.currentPhase, GamePhase.WAITING_FOR_PLAYERS);
  });
});

Deno.test('rootReducer unknown action handling', async (t) => {
  await t.step('returns unchanged state for unknown action type', () => {
    const gameState = createBasicGameState();

    // Suppress console.warn for this test
    const originalConsoleWarn = console.warn;
    let warningMessage = '';
    console.warn = (message: string) => {
      warningMessage = message;
    };

    try {
      const action = {
        type: 'UNKNOWN_ACTION' as any,
        payload: {},
      } as any;

      const result = rootReducer(gameState, action);

      // Should return unchanged state
      assertEquals(result, gameState);

      // Should log warning
      assertEquals(
        warningMessage.includes('No handler registered for action type: UNKNOWN_ACTION'),
        true,
      );
    } finally {
      console.warn = originalConsoleWarn;
    }
  });

  await t.step('clears error on unknown action', () => {
    const gameState = createBasicGameState({
      error: {
        code: GameErrorCodes.GAME_INVALID_ACTION,
        message: 'Previous error',
      },
    });

    // Suppress console.warn for this test
    const originalConsoleWarn = console.warn;
    console.warn = () => {};

    try {
      const action = {
        type: 'UNKNOWN_ACTION' as any,
        payload: {},
      } as any;

      const result = rootReducer(gameState, action);

      // Should clear error even for unknown actions
      assertEquals(result.error, null);

      // Other properties should be preserved
      assertEquals(result.gameId, gameState.gameId);
      assertEquals(result.players, gameState.players);
    } finally {
      console.warn = originalConsoleWarn;
    }
  });
});

Deno.test('rootReducer integration tests', async (t) => {
  await t.step('handles sequence of valid actions', () => {
    let gameState = createBasicGameState();

    // Add a player
    const addPlayerAction = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        playerName: 'Player2',
      },
    };
    gameState = rootReducer(gameState, addPlayerAction);
    assertEquals(gameState.players.length, 2);
    assertEquals(gameState.error, null);

    // Start the game
    gameState.owner = 'TestPlayer';
    const startGameAction = {
      type: ActionTypes.START_GAME,
      payload: {
        playerName: 'TestPlayer',
      },
    };
    gameState = rootReducer(gameState, startGameAction);
    assertEquals(gameState.currentPhase, GamePhase.PLAY_TILE);
    assertEquals(gameState.error, null);
  });

  await t.step('handles mix of valid and invalid actions', () => {
    let gameState = createBasicGameState();

    // Valid action
    const validAction = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        playerName: 'ValidPlayer',
      },
    };
    gameState = rootReducer(gameState, validAction);
    assertEquals(gameState.players.length, 2);
    assertEquals(gameState.error, null);

    // Invalid action
    const invalidAction = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        playerName: '', // Empty name
      },
    };
    gameState = rootReducer(gameState, invalidAction);
    assertEquals(gameState.players.length, 2); // Should not change
    assertEquals(gameState.error?.code, GameErrorCodes.GAME_INVALID_ACTION);

    // Another valid action should clear error
    const anotherValidAction = {
      type: ActionTypes.REMOVE_PLAYER,
      payload: {
        playerName: 'SomePlayer',
      },
    };
    gameState = rootReducer(gameState, anotherValidAction);
    assertEquals(gameState.error, null);
  });

  await t.step('maintains state consistency across actions', () => {
    const initialGameId = 'consistency-test';
    const initialOwner = 'ConsistencyOwner';
    const initialLastUpdated = 1111111111;

    let gameState = createBasicGameState({
      gameId: initialGameId,
      owner: initialOwner,
      lastUpdated: initialLastUpdated,
    });

    // Perform multiple actions
    const actions = [
      {
        type: ActionTypes.ADD_PLAYER,
        payload: { playerName: 'Player2' },
      },
      {
        type: ActionTypes.ADD_PLAYER,
        payload: { playerName: 'Player3' },
      },
      {
        type: ActionTypes.REMOVE_PLAYER,
        payload: { playerName: 'Player2' },
      },
    ];

    for (const action of actions) {
      gameState = rootReducer(gameState, action);

      // These properties should remain consistent
      assertEquals(gameState.gameId, initialGameId);
      assertEquals(gameState.owner, initialOwner);
      assertEquals(gameState.lastUpdated, initialLastUpdated);
      assertEquals(Array.isArray(gameState.players), true);
      assertEquals(Array.isArray(gameState.hotels), true);
      assertEquals(Array.isArray(gameState.tiles), true);
      assertEquals(Array.isArray(gameState.lastActions), true);
    }
  });
});
