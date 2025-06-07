import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { expect } from 'jsr:@std/expect';
import { startGameReducer } from './gameReducers.ts';
import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type Player,
} from '@/engine/types/index.ts';
import { ActionTypes } from '@/engine/types/actionsTypes.ts';
import { COLS, INITIAL_PLAYER_MONEY, MINIMUM_PLAYERS, ROWS } from '@/engine/config/gameConfig.ts';
import { initializeTiles } from '@/engine/domain/tileOperations.ts';

// Helper function to create a basic game state
function createBasicGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameId: 'test-game',
    owner: 'TestOwner',
    currentPhase: GamePhase.WAITING_FOR_PLAYERS,
    currentTurn: 0,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [],
    hotels: [],
    tiles: initializeTiles(ROWS, COLS), // Use proper tile initialization
    error: null,
    lastActions: [],
    ...overrides,
  };
}

// Helper function to create a player
function createPlayer(id: number, name: string): Player {
  return {
    id,
    name,
    money: INITIAL_PLAYER_MONEY,
    shares: {},
    tiles: [],
  };
}

Deno.test('startGameReducer validation tests', async (t) => {
  await t.step('throws error when not in WAITING_FOR_PLAYERS phase', () => {
    const gameState = createBasicGameState({
      currentPhase: GamePhase.PLAY_TILE,
      players: [createPlayer(0, 'Player1'), createPlayer(1, 'Player2')],
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        playerName: 'TestOwner',
      },
    };

    const error = assertThrows(
      () => startGameReducer(gameState, action),
      GameError,
      "Can't add players, game already in progress",
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when not enough players', () => {
    const gameState = createBasicGameState({
      players: [createPlayer(0, 'Player1')], // Only 1 player, need minimum 2
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        playerName: 'TestOwner',
      },
    };

    const error = assertThrows(
      () => startGameReducer(gameState, action),
      GameError,
      `Can't start game without minimum of ${MINIMUM_PLAYERS} players`,
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when non-owner tries to start game', () => {
    const gameState = createBasicGameState({
      owner: 'TestOwner',
      players: [createPlayer(0, 'Player1'), createPlayer(1, 'Player2')],
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        playerName: 'NotTheOwner',
      },
    };

    const error = assertThrows(
      () => startGameReducer(gameState, action),
      GameError,
      'Only player TestOwner can start the game',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });
});

Deno.test('startGameReducer successful start tests', async (t) => {
  await t.step('successfully starts game with minimum players', () => {
    const player1 = createPlayer(0, 'Player1');
    const player2 = createPlayer(1, 'Player2');

    const gameState = createBasicGameState({
      owner: 'TestOwner',
      players: [player1, player2],
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        playerName: 'TestOwner',
      },
    };

    const result = startGameReducer(gameState, action);

    // Check phase transition
    assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
    assertEquals(result.currentPlayer, 0);
    assertEquals(result.currentTurn, 1);

    // Check players have been sorted and assigned IDs
    assertEquals(result.players.length, 2);
    assertEquals(result.players[0].id, 0);
    assertEquals(result.players[1].id, 1);

    // Check each player has a first tile
    expect(result.players[0].firstTile).toBeDefined();
    expect(result.players[1].firstTile).toBeDefined();
    assertEquals(result.players[0].firstTile!.location, 'board');
    assertEquals(result.players[1].firstTile!.location, 'board');

    // Check each player has 6 tiles in hand
    assertEquals(result.players[0].tiles.length, 6);
    assertEquals(result.players[1].tiles.length, 6);

    // Check tiles belong to the correct players
    result.players[0].tiles.forEach((tile) => assertEquals(tile.location, 0));
    result.players[1].tiles.forEach((tile) => assertEquals(tile.location, 1));
  });

  await t.step('successfully starts game with multiple players and sorts them', () => {
    // Create players in a specific order
    const player1 = createPlayer(0, 'Player1');
    const player2 = createPlayer(1, 'Player2');
    const player3 = createPlayer(2, 'Player3');

    const gameState = createBasicGameState({
      owner: 'TestOwner',
      players: [player1, player2, player3],
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        playerName: 'TestOwner',
      },
    };

    const result = startGameReducer(gameState, action);

    // Check all players are present and have correct IDs
    assertEquals(result.players.length, 3);
    assertEquals(result.players[0].id, 0);
    assertEquals(result.players[1].id, 1);
    assertEquals(result.players[2].id, 2);

    // Check players are sorted by their first tile (this is deterministic based on tile comparison)
    const firstTiles = result.players.map((p) => p.firstTile!);
    for (let i = 0; i < firstTiles.length - 1; i++) {
      // First tile should be "less than or equal to" the next one based on tile comparison
      const tile1 = firstTiles[i];
      const tile2 = firstTiles[i + 1];
      const isOrdered = tile1.col < tile2.col ||
        (tile1.col === tile2.col && tile1.row <= tile2.row);
      expect(isOrdered).toBe(true);
    }

    // Check all players have 6 tiles
    result.players.forEach((player) => {
      assertEquals(player.tiles.length, 6);
      player.tiles.forEach((tile) => assertEquals(tile.location, player.id));
    });
  });
});

Deno.test('gameReducers integration tests', async (t) => {
  await t.step('complete game start flow', () => {
    // Start with a game waiting for players
    let gameState = createBasicGameState({
      owner: 'Owner',
      players: [
        createPlayer(0, 'Player1'),
        createPlayer(1, 'Player2'),
      ],
    });

    // Start the game
    const startAction = {
      type: ActionTypes.START_GAME,
      payload: {
        playerName: 'Owner',
      },
    };

    gameState = startGameReducer(gameState, startAction);

    // Verify game started correctly
    assertEquals(gameState.currentPhase, GamePhase.PLAY_TILE);
    assertEquals(gameState.currentPlayer, 0);
    assertEquals(gameState.currentTurn, 1);

    // Verify turn started correctly
    assertEquals(gameState.currentPhase, GamePhase.PLAY_TILE);
    expect(gameState.players[0].tiles.length).toBeGreaterThan(0);
  });
});
