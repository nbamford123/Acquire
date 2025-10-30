import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { startGameReducer } from '../startGameReducers.ts';
import { initializeTiles } from '../../domain/tileOperations.ts';
import { initializeHotels } from '../../domain/hotelOperations.ts';
import {
  ActionTypes,
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  INITIAL_PLAYER_MONEY,
  MINIMUM_PLAYERS,
  type Player,
  TILES_PER_HAND,
} from '../../types/index.ts';

// Helper function to create a basic game state
function createBasicGameState(overrides: Partial<GameState> = {}): GameState {
  const defaultPlayers: Player[] = [
    {
      id: 0,
      name: 'Player1',
      money: INITIAL_PLAYER_MONEY,
    },
    {
      id: 1,
      name: 'Player2',
      money: INITIAL_PLAYER_MONEY,
    },
  ];

  return {
    gameId: 'test-game',
    owner: 'Player1',
    currentPhase: GamePhase.WAITING_FOR_PLAYERS,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: defaultPlayers,
    hotels: initializeHotels(),
    tiles: initializeTiles(12, 9),
    error: null,
    ...overrides,
  };
}

Deno.test('startGameReducer validation tests', async (t) => {
  await t.step('throws error when not in WAITING_FOR_PLAYERS phase', () => {
    const gameState = createBasicGameState({
      currentPhase: GamePhase.PLAY_TILE,
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        player: 'Player1',
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
      players: [{
        id: 0,
        name: 'OnlyPlayer',
        money: INITIAL_PLAYER_MONEY,
      }],
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        player: 'OnlyPlayer',
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
      owner: 'Player1',
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        player: 'Player2', // Not the owner
      },
    };

    const error = assertThrows(
      () => startGameReducer(gameState, action),
      GameError,
      'Only player Player1 can start the game',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('throws error when player name does not match owner', () => {
    const gameState = createBasicGameState({
      owner: 'GameOwner',
      players: [
        { id: 0, name: 'Player1', money: INITIAL_PLAYER_MONEY },
        { id: 1, name: 'Player2', money: INITIAL_PLAYER_MONEY },
      ],
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        player: 'Player1', // Not the owner
      },
    };

    const error = assertThrows(
      () => startGameReducer(gameState, action),
      GameError,
      'Only player GameOwner can start the game',
    );
    assertEquals(error.code, GameErrorCodes.GAME_INVALID_ACTION);
  });
});

Deno.test('startGameReducer successful game start tests', async (t) => {
  await t.step('successfully starts game with minimum players', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        player: 'Player1',
      },
    };

    const result = startGameReducer(gameState, action);

    // Should transition to PLAY_TILE phase
    assertEquals(result.currentPhase, GamePhase.PLAY_TILE);

    // Should set current player to 0 (first player)
    assertEquals(result.currentPlayer, 0);

    // Should set current turn to 1
    assertEquals(result.currentTurn, 1);

    // Players should be sorted by their first tile
    assertEquals(result.players.length, 2);
    assertEquals(result.players[0].id, 0);
    assertEquals(result.players[1].id, 1);

    // Each player should have a first tile assigned
    assertEquals(typeof result.players[0].firstTile?.row, 'number');
    assertEquals(typeof result.players[0].firstTile?.col, 'number');
    assertEquals(typeof result.players[1].firstTile?.row, 'number');
    assertEquals(typeof result.players[1].firstTile?.col, 'number');
  });

  await t.step('assigns first tiles to board and draws hand tiles', () => {
    const gameState = createBasicGameState();

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        player: 'Player1',
      },
    };

    const result = startGameReducer(gameState, action);

    // Count tiles on board (should be 2 - one for each player's first tile)
    const boardTiles = result.tiles.filter((t) => t.location === 'board');
    assertEquals(boardTiles.length, 2);

    // Count tiles in each player's hand (should be TILES_PER_HAND each)
    const player0Tiles = result.tiles.filter((t) => t.location === 0);
    const player1Tiles = result.tiles.filter((t) => t.location === 1);
    assertEquals(player0Tiles.length, TILES_PER_HAND);
    assertEquals(player1Tiles.length, TILES_PER_HAND);

    // Count remaining tiles in bag
    const bagTiles = result.tiles.filter((t) => t.location === 'bag');
    const expectedBagTiles = 12 * 9 - 2 - (2 * TILES_PER_HAND); // Total - first tiles - hand tiles
    assertEquals(bagTiles.length, expectedBagTiles);
  });

  await t.step('sorts players by first tile position', () => {
    const gameState = createBasicGameState({
      players: [
        { id: 0, name: 'Player1', money: INITIAL_PLAYER_MONEY },
        { id: 1, name: 'Player2', money: INITIAL_PLAYER_MONEY },
        { id: 2, name: 'Player3', money: INITIAL_PLAYER_MONEY },
      ],
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        player: 'Player1',
      },
    };

    const result = startGameReducer(gameState, action);

    // Players should be sorted by their first tile (lexicographically)
    // The first tile should be the "smallest" tile position
    const firstTiles = result.players.map((p) => p.firstTile!);

    // Verify tiles are sorted (each subsequent tile should be >= previous)
    for (let i = 1; i < firstTiles.length; i++) {
      const prev = firstTiles[i - 1];
      const curr = firstTiles[i];

      // Compare column first, then row
      const prevValue = prev.col * 100 + prev.row;
      const currValue = curr.col * 100 + curr.row;

      assertEquals(
        prevValue <= currValue,
        true,
        `Tiles not sorted: ${prev.row},${prev.col} should be <= ${curr.row},${curr.col}`,
      );
    }
  });

  await t.step('preserves other game state properties', () => {
    const gameState = createBasicGameState({
      gameId: 'test-start-game-123',
      lastUpdated: 1234567890,
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        player: 'Player1',
      },
    };

    const result = startGameReducer(gameState, action);

    // Check that other properties are preserved
    assertEquals(result.gameId, 'test-start-game-123');
    assertEquals(result.owner, 'Player1');
    assertEquals(result.lastUpdated, 1234567890);
    assertEquals(result.error, null);
  });

  await t.step('handles maximum number of players', () => {
    const players: Player[] = [];
    for (let i = 0; i < 6; i++) { // Maximum players
      players.push({
        id: i,
        name: `Player${i}`,
        money: INITIAL_PLAYER_MONEY,
      });
    }

    const gameState = createBasicGameState({
      owner: 'Player0',
      players,
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        player: 'Player0',
      },
    };

    const result = startGameReducer(gameState, action);

    // Should successfully start with 6 players
    assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
    assertEquals(result.players.length, 6);

    // Each player should have first tile and hand tiles
    for (let i = 0; i < 6; i++) {
      assertEquals(typeof result.players[i].firstTile?.row, 'number');
      assertEquals(typeof result.players[i].firstTile?.col, 'number');

      const playerTiles = result.tiles.filter((t) => t.location === i);
      assertEquals(playerTiles.length, TILES_PER_HAND);
    }

    // Should have 6 tiles on board (one per player)
    const boardTiles = result.tiles.filter((t) => t.location === 'board');
    assertEquals(boardTiles.length, 6);
  });

  await t.step('assigns unique first tiles to each player', () => {
    const gameState = createBasicGameState({
      players: [
        { id: 0, name: 'Player1', money: INITIAL_PLAYER_MONEY },
        { id: 1, name: 'Player2', money: INITIAL_PLAYER_MONEY },
        { id: 2, name: 'Player3', money: INITIAL_PLAYER_MONEY },
      ],
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        player: 'Player1',
      },
    };

    const result = startGameReducer(gameState, action);

    // Collect all first tiles
    const firstTiles = result.players.map((p) => p.firstTile!);

    // Verify all first tiles are unique
    const uniqueTiles = new Set(firstTiles.map((t) => `${t.row},${t.col}`));
    assertEquals(uniqueTiles.size, firstTiles.length, 'First tiles should be unique');

    // Verify first tiles are on the board
    for (const firstTile of firstTiles) {
      const boardTile = result.tiles.find((t) =>
        t.location === 'board' &&
        t.row === firstTile.row &&
        t.col === firstTile.col
      );
      assertEquals(
        boardTile !== undefined,
        true,
        `First tile ${firstTile.row},${firstTile.col} should be on board`,
      );
    }
  });

  await t.step('updates player IDs based on sorted order', () => {
    const gameState = createBasicGameState({
      owner: 'PlayerA',
      players: [
        { id: 0, name: 'PlayerA', money: INITIAL_PLAYER_MONEY },
        { id: 1, name: 'PlayerB', money: INITIAL_PLAYER_MONEY },
        { id: 2, name: 'PlayerC', money: INITIAL_PLAYER_MONEY },
      ],
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        player: 'PlayerA',
      },
    };

    const result = startGameReducer(gameState, action);

    // Players should have IDs 0, 1, 2 based on their sorted order
    assertEquals(result.players[0].id, 0);
    assertEquals(result.players[1].id, 1);
    assertEquals(result.players[2].id, 2);

    // Names should be preserved
    assertEquals(result.players.map((p) => p.name).includes('PlayerA'), true);
    assertEquals(result.players.map((p) => p.name).includes('PlayerB'), true);
    assertEquals(result.players.map((p) => p.name).includes('PlayerC'), true);
  });
});

Deno.test('startGameReducer edge cases', async (t) => {
  await t.step('handles exactly minimum number of players', () => {
    const gameState = createBasicGameState({
      players: [
        { id: 0, name: 'Player1', money: INITIAL_PLAYER_MONEY },
        { id: 1, name: 'Player2', money: INITIAL_PLAYER_MONEY },
      ],
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        player: 'Player1',
      },
    };

    const result = startGameReducer(gameState, action);

    assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
    assertEquals(result.players.length, MINIMUM_PLAYERS);
  });

  await t.step('preserves player money and names', () => {
    const gameState = createBasicGameState({
      owner: 'RichPlayer',
      players: [
        { id: 0, name: 'RichPlayer', money: 5000 },
        { id: 1, name: 'PoorPlayer', money: 1000 },
      ],
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        player: 'RichPlayer',
      },
    };

    const result = startGameReducer(gameState, action);

    // Money should be preserved
    const richPlayer = result.players.find((p) => p.name === 'RichPlayer');
    const poorPlayer = result.players.find((p) => p.name === 'PoorPlayer');

    assertEquals(richPlayer?.money, 5000);
    assertEquals(poorPlayer?.money, 1000);
  });

  await t.step('handles case where owner is not first player after sorting', () => {
    // This test ensures the game can start even if the owner ends up not being player 0 after sorting
    const gameState = createBasicGameState({
      owner: 'OwnerPlayer',
      players: [
        { id: 0, name: 'FirstPlayer', money: INITIAL_PLAYER_MONEY },
        { id: 1, name: 'OwnerPlayer', money: INITIAL_PLAYER_MONEY },
      ],
    });

    const action = {
      type: ActionTypes.START_GAME,
      payload: {
        player: 'OwnerPlayer',
      },
    };

    const result = startGameReducer(gameState, action);

    // Should successfully start regardless of owner's final position
    assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
    assertEquals(result.currentPlayer, 0); // Always starts with player 0

    // Owner should still be preserved
    assertEquals(result.owner, 'OwnerPlayer');
  });
});
