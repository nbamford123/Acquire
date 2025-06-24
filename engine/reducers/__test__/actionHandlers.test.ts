import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { actionHandlers } from '../actionHandlers.ts';
import { initializeTiles } from '../../domain/tileOperations.ts';
import { initializeHotels } from '../../domain/hotelOperations.ts';
import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type Player,
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
    ...overrides,
  };
}

Deno.test('actionHandlers registry tests', async (t) => {
  await t.step('has handler for ADD_PLAYER action', () => {
    const handler = actionHandlers[ActionTypes.ADD_PLAYER];
    assertEquals(typeof handler, 'function');
  });

  await t.step('has handler for REMOVE_PLAYER action', () => {
    const handler = actionHandlers[ActionTypes.REMOVE_PLAYER];
    assertEquals(typeof handler, 'function');
  });

  await t.step('has handler for START_GAME action', () => {
    const handler = actionHandlers[ActionTypes.START_GAME];
    assertEquals(typeof handler, 'function');
  });

  await t.step('has handler for PLAY_TILE action', () => {
    const handler = actionHandlers[ActionTypes.PLAY_TILE];
    assertEquals(typeof handler, 'function');
  });

  await t.step('has handler for BUY_SHARES action', () => {
    const handler = actionHandlers[ActionTypes.BUY_SHARES];
    assertEquals(typeof handler, 'function');
  });

  await t.step('has handler for FOUND_HOTEL action', () => {
    const handler = actionHandlers[ActionTypes.FOUND_HOTEL];
    assertEquals(typeof handler, 'function');
  });

  await t.step('has handler for RESOLVE_MERGER action', () => {
    const handler = actionHandlers[ActionTypes.RESOLVE_MERGER];
    assertEquals(typeof handler, 'function');
  });

  await t.step('has handler for BREAK_MERGER_TIE action', () => {
    const handler = actionHandlers[ActionTypes.BREAK_MERGER_TIE];
    assertEquals(typeof handler, 'function');
  });

  await t.step('has handlers for all action types', () => {
    const actionTypes = Object.values(ActionTypes);
    const handlerKeys = Object.keys(actionHandlers);

    // Check that we have a handler for each action type
    for (const actionType of actionTypes) {
      assertEquals(
        handlerKeys.includes(actionType),
        true,
        `Missing handler for action type: ${actionType}`,
      );
    }

    // Check that we don't have extra handlers
    assertEquals(
      handlerKeys.length,
      actionTypes.length,
      'Number of handlers should match number of action types',
    );
  });
});

Deno.test('actionHandlers execution tests', async (t) => {
  await t.step('ADD_PLAYER handler executes successfully', () => {
    const gameState = createBasicGameState();
    const handler = actionHandlers[ActionTypes.ADD_PLAYER];

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'NewPlayer',
      },
    };

    const result = handler(gameState, action);

    // Should add the new player
    assertEquals(result.players.length, 2);
    assertEquals(result.players[1].name, 'NewPlayer');
  });

  await t.step('REMOVE_PLAYER handler executes successfully', () => {
    const gameState = createBasicGameState();
    const handler = actionHandlers[ActionTypes.REMOVE_PLAYER];

    const action = {
      type: ActionTypes.REMOVE_PLAYER,
      payload: {
        player: 'TestPlayer',
      },
    };

    const result = handler(gameState, action);

    // Should return unchanged state (not implemented)
    assertEquals(result, gameState);
  });

  await t.step('START_GAME handler executes successfully', () => {
    const gameState = createBasicGameState({
      players: [
        { id: 0, name: 'Player1', money: INITIAL_PLAYER_MONEY },
        { id: 1, name: 'Player2', money: INITIAL_PLAYER_MONEY },
      ],
      owner: 'Player1',
    });
    const handler = actionHandlers[ActionTypes.START_GAME];

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        player: 'Player1',
      },
    };

    const result = handler(gameState, action);

    // Should transition to PLAY_TILE phase
    assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
  });

  await t.step('BUY_SHARES handler executes successfully', () => {
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
    const handler = actionHandlers[ActionTypes.BUY_SHARES];

    const action = {
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: 'TestPlayer',
        shares: { Worldwide: 1 },
      },
    };

    const result = handler(gameState, action);

    // Should transition to PLAY_TILE phase
    assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
  });

  await t.step('FOUND_HOTEL handler executes successfully', () => {
    const gameState = createBasicGameState({
      currentPhase: GamePhase.FOUND_HOTEL,
      foundHotelContext: {
        availableHotels: ['Worldwide', 'Sackson'],
        tiles: [{ row: 3, col: 1 }, { row: 3, col: 2 }],
      },
      tiles: createBasicGameState().tiles.map((tile) => {
        // Place context tiles on board
        if ((tile.row === 3 && tile.col === 1) || (tile.row === 3 && tile.col === 2)) {
          return { ...tile, location: 'board' as const };
        }
        return tile;
      }),
    });
    const handler = actionHandlers[ActionTypes.FOUND_HOTEL];

    const action = {
      type: ActionTypes.FOUND_HOTEL,
      payload: {
        player: 'TestPlayer',
        hotelName: 'Worldwide' as const,
      },
    };

    const result = handler(gameState, action);

    // Should transition to BUY_SHARES phase
    assertEquals(result.currentPhase, GamePhase.BUY_SHARES);
  });

  await t.step('handlers throw errors for invalid actions', () => {
    const gameState = createBasicGameState();
    const handler = actionHandlers[ActionTypes.ADD_PLAYER];

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: '', // Invalid empty name
      },
    };

    assertThrows(
      () => handler(gameState, action),
      GameError,
      'Player name cannot be empty',
    );
  });

  await t.step('handlers preserve game state structure', () => {
    const gameState = createBasicGameState({
      gameId: 'test-handlers-123',
      owner: 'TestOwner',
      lastUpdated: 1234567890,
    });
    const handler = actionHandlers[ActionTypes.ADD_PLAYER];

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'NewPlayer',
      },
    };

    const result = handler(gameState, action);

    // Should preserve other properties
    assertEquals(result.gameId, 'test-handlers-123');
    assertEquals(result.owner, 'TestOwner');
    assertEquals(result.lastUpdated, 1234567890);
    assertEquals(typeof result.currentPhase, 'string');
    assertEquals(Array.isArray(result.players), true);
    assertEquals(Array.isArray(result.hotels), true);
    assertEquals(Array.isArray(result.tiles), true);
  });
});

Deno.test('actionHandlers type safety tests', async (t) => {
  await t.step('all handlers accept GameState and GameAction', () => {
    const gameState = createBasicGameState();

    // Test that each handler can be called with basic parameters
    for (const [actionType, handler] of Object.entries(actionHandlers)) {
      assertEquals(typeof handler, 'function');

      // Create a minimal action for each type
      let action;
      switch (actionType) {
        case ActionTypes.ADD_PLAYER:
          action = { type: actionType, payload: { player: 'Test' } };
          break;
        case ActionTypes.REMOVE_PLAYER:
          action = { type: actionType, payload: { player: 'Test' } };
          break;
        case ActionTypes.START_GAME:
          action = { type: actionType, payload: { player: 'TestPlayer' } };
          break;
        case ActionTypes.PLAY_TILE:
          action = { type: actionType, payload: { player: 'TestPlayer', tile: { row: 0, col: 0 } } };
          break;
        case ActionTypes.BUY_SHARES:
          action = { type: actionType, payload: { player: 'TestPlayer', shares: {} } };
          break;
        case ActionTypes.FOUND_HOTEL:
          action = { type: actionType, payload: { player: 'TestPlayer', hotelName: 'Worldwide' as const } };
          break;
        case ActionTypes.RESOLVE_MERGER:
          action = { type: actionType, payload: { player: 'TestPlayer', shares: { sell: 0, trade: 0 } } };
          break;
        case ActionTypes.BREAK_MERGER_TIE:
          action = {
            type: actionType,
            payload: {
              player: 'TestPlayer',
              resolvedTie: { survivor: 'Worldwide' as const, merged: 'Sackson' as const },
            },
          };
          break;
        default:
          action = { type: actionType, payload: {} } as any;
      }

      // Should not throw type errors (though may throw game logic errors)
      try {
        const result = handler(gameState, action);
        assertEquals(typeof result, 'object');
        assertEquals(result !== null, true);
      } catch (error) {
        // Game logic errors are expected for some invalid states
        assertEquals(error instanceof GameError, true);
      }
    }
  });

  await t.step('all handlers return GameState objects', () => {
    const gameState = createBasicGameState();
    const handler = actionHandlers[ActionTypes.ADD_PLAYER];

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'ValidPlayer',
      },
    };

    const result = handler(gameState, action);

    // Check that result has GameState structure
    assertEquals(typeof result.gameId, 'string');
    assertEquals(typeof result.owner, 'string');
    assertEquals(typeof result.currentPhase, 'string');
    assertEquals(typeof result.currentTurn, 'number');
    assertEquals(typeof result.currentPlayer, 'number');
    assertEquals(typeof result.lastUpdated, 'number');
    assertEquals(Array.isArray(result.players), true);
    assertEquals(Array.isArray(result.hotels), true);
    assertEquals(Array.isArray(result.tiles), true);
  });
});
