import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { addPlayerReducer, removePlayerReducer } from '../playerReducers.ts';
import { initializeTiles } from '../../domain/tileOperations.ts';
import { initializeHotels } from '../../domain/hotelOperations.ts';
import {
  ActionTypes,
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  INITIAL_PLAYER_MONEY,
  MAX_PLAYERS,
  type Player,
} from '../../types/index.ts';

// Helper function to create a basic game state
function createBasicGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameId: 'test-game',
    owner: 'TestOwner',
    currentPhase: GamePhase.WAITING_FOR_PLAYERS,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [],
    hotels: initializeHotels(),
    tiles: initializeTiles(12, 9),
    error: null,
    ...overrides,
  };
}

Deno.test('addPlayerReducer validation tests', async (t) => {
  await t.step('throws error when game not in WAITING_FOR_PLAYERS phase', () => {
    const gameState = createBasicGameState({
      currentPhase: GamePhase.PLAY_TILE,
    });

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'TestPlayer',
      },
    };

    const error = assertThrows(
      () => addPlayerReducer(gameState, action),
      GameError,
      "Can't add player, game already in progress",
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when maximum players reached', () => {
    const players: Player[] = [];
    for (let i = 0; i < MAX_PLAYERS; i++) {
      players.push({
        id: i,
        name: `Player${i}`,
        money: INITIAL_PLAYER_MONEY,
      });
    }

    const gameState = createBasicGameState({
      players,
    });

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'ExtraPlayer',
      },
    };

    const error = assertThrows(
      () => addPlayerReducer(gameState, action),
      GameError,
      `Game already has maximum of ${MAX_PLAYERS} players`,
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when player name is empty', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: '',
      },
    };

    const error = assertThrows(
      () => addPlayerReducer(gameState, action),
      GameError,
      'Player name cannot be empty',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when player name is only whitespace', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: '   ',
      },
    };

    const error = assertThrows(
      () => addPlayerReducer(gameState, action),
      GameError,
      'Player name cannot be empty',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when player name is reserved word', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'bank',
      },
    };

    const error = assertThrows(
      () => addPlayerReducer(gameState, action),
      GameError,
      'bank is a reserved word, please choose another',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when player name is too long', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'ThisPlayerNameIsWayTooLongAndExceedsTwentyCharacters',
      },
    };

    const error = assertThrows(
      () => addPlayerReducer(gameState, action),
      GameError,
      'Player name must be less than 20 characters',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when player name already exists', () => {
    const gameState = createBasicGameState({
      players: [{
        id: 0,
        name: 'ExistingPlayer',
        money: INITIAL_PLAYER_MONEY,
      }],
    });

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'ExistingPlayer',
      },
    };

    const error = assertThrows(
      () => addPlayerReducer(gameState, action),
      GameError,
      'A player with this name already exists',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error for each reserved name', () => {
    const reservedNames = ['bank', 'bag', 'board', 'dead'];

    for (const reservedName of reservedNames) {
      const gameState = createBasicGameState();

      const action = {
        type: ActionTypes.ADD_PLAYER,
        payload: {
          player: reservedName,
        },
      };

      const error = assertThrows(
        () => addPlayerReducer(gameState, action),
        GameError,
        `${reservedName} is a reserved word, please choose another`,
      );
      assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
    }
  });
});

Deno.test('addPlayerReducer successful addition tests', async (t) => {
  await t.step('successfully adds first player', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'FirstPlayer',
      },
    };

    const result = addPlayerReducer(gameState, action);

    assertEquals(result.players.length, 1);
    assertEquals(result.players[0].name, 'FirstPlayer');
    assertEquals(result.players[0].money, INITIAL_PLAYER_MONEY);
    assertEquals(typeof result.players[0].id, 'number');
  });

  await t.step('successfully adds multiple players', () => {
    let gameState = createBasicGameState();

    // Add first player
    const action1 = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'Player1',
      },
    };
    gameState = addPlayerReducer(gameState, action1);

    // Add second player
    const action2 = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'Player2',
      },
    };
    gameState = addPlayerReducer(gameState, action2);

    assertEquals(gameState.players.length, 2);
    assertEquals(gameState.players[0].name, 'Player1');
    assertEquals(gameState.players[1].name, 'Player2');
    assertEquals(gameState.players[0].money, INITIAL_PLAYER_MONEY);
    assertEquals(gameState.players[1].money, INITIAL_PLAYER_MONEY);
  });

  await t.step('successfully adds player with exactly 20 characters', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'ExactlyTwentyChars12', // Exactly 20 characters
      },
    };

    const result = addPlayerReducer(gameState, action);

    assertEquals(result.players.length, 1);
    assertEquals(result.players[0].name, 'ExactlyTwentyChars12');
  });

  await t.step('preserves other game state properties', () => {
    const gameState = createBasicGameState({
      gameId: 'test-add-player-123',
      owner: 'GameOwner',
      currentTurn: 5,
      lastUpdated: 1234567890,
    });

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'NewPlayer',
      },
    };

    const result = addPlayerReducer(gameState, action);

    // Check that other properties are preserved
    assertEquals(result.gameId, 'test-add-player-123');
    assertEquals(result.owner, 'GameOwner');
    assertEquals(result.currentTurn, 5);
    assertEquals(result.lastUpdated, 1234567890);
    assertEquals(result.error, null);
    assertEquals(result.currentPhase, GamePhase.WAITING_FOR_PLAYERS);
  });

  await t.step('adds players up to maximum limit', () => {
    let gameState = createBasicGameState();

    // Add maximum number of players
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const action = {
        type: ActionTypes.ADD_PLAYER,
        payload: {
          player: `Player${i}`,
        },
      };
      gameState = addPlayerReducer(gameState, action);
    }

    assertEquals(gameState.players.length, MAX_PLAYERS);

    // Verify all players were added correctly
    for (let i = 0; i < MAX_PLAYERS; i++) {
      assertEquals(gameState.players[i].name, `Player${i}`);
      assertEquals(gameState.players[i].money, INITIAL_PLAYER_MONEY);
    }
  });

  await t.step('handles player names with special characters', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'Player-123_Test!',
      },
    };

    const result = addPlayerReducer(gameState, action);

    assertEquals(result.players.length, 1);
    assertEquals(result.players[0].name, 'Player-123_Test!');
  });

  await t.step('handles player names with numbers', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: '12345',
      },
    };

    const result = addPlayerReducer(gameState, action);

    assertEquals(result.players.length, 1);
    assertEquals(result.players[0].name, '12345');
  });
});

Deno.test('addPlayerReducer edge cases', async (t) => {
  await t.step('handles case-sensitive player names', () => {
    let gameState = createBasicGameState();

    // Add first player
    const action1 = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'player',
      },
    };
    gameState = addPlayerReducer(gameState, action1);

    // Add second player with different case
    const action2 = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'Player',
      },
    };
    gameState = addPlayerReducer(gameState, action2);

    // Should allow both since they're different cases
    assertEquals(gameState.players.length, 2);
    assertEquals(gameState.players[0].name, 'player');
    assertEquals(gameState.players[1].name, 'Player');
  });

  await t.step('handles reserved names case sensitivity', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'BANK', // Different case from reserved 'bank'
      },
    };

    const result = addPlayerReducer(gameState, action);

    // Should succeed since reserved names are case-sensitive
    assertEquals(result.players.length, 1);
    assertEquals(result.players[0].name, 'BANK');
  });

  await t.step('initializes player with correct default values', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.ADD_PLAYER,
      payload: {
        player: 'TestPlayer',
      },
    };

    const result = addPlayerReducer(gameState, action);

    const player = result.players[0];
    assertEquals(player.name, 'TestPlayer');
    assertEquals(player.money, INITIAL_PLAYER_MONEY);
    assertEquals(typeof player.id, 'number');

    // Player should not have any additional properties that aren't expected
    const expectedKeys = ['id', 'name', 'money'];
    const actualKeys = Object.keys(player).sort();
    assertEquals(actualKeys, expectedKeys.sort());
  });
});

Deno.test('removePlayerReducer tests', async (t) => {
  await t.step('returns unchanged state (not implemented)', () => {
    const gameState = createBasicGameState({
      players: [{
        id: 0,
        name: 'TestPlayer',
        money: INITIAL_PLAYER_MONEY,
      }],
    });

    const action = {
      type: ActionTypes.REMOVE_PLAYER,
      payload: {
        player: 'TestPlayer',
      },
    };

    const result = removePlayerReducer(gameState, action);

    // Should return unchanged state since it's not implemented
    assertEquals(result, gameState);
    assertEquals(result.players.length, 1);
    assertEquals(result.players[0].name, 'TestPlayer');
  });

  await t.step('preserves all game state properties', () => {
    const gameState = createBasicGameState({
      gameId: 'test-remove-player',
      owner: 'TestOwner',
      currentPhase: GamePhase.WAITING_FOR_PLAYERS,
      players: [
        { id: 0, name: 'Player1', money: INITIAL_PLAYER_MONEY },
        { id: 1, name: 'Player2', money: INITIAL_PLAYER_MONEY },
      ],
    });

    const action = {
      type: ActionTypes.REMOVE_PLAYER,
      payload: {
        player: 'Player1',
      },
    };

    const result = removePlayerReducer(gameState, action);

    // All properties should be preserved exactly
    assertEquals(result.gameId, gameState.gameId);
    assertEquals(result.owner, gameState.owner);
    assertEquals(result.currentPhase, gameState.currentPhase);
    assertEquals(result.players, gameState.players);
  });
});
