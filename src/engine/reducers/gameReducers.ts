import { MINIMUM_PLAYERS } from "@/engine/config/gameConfig.ts";
import {
  type ActionResult,
  GameErrorCodes,
  GamePhase,
  type GameState,
} from "@/engine/types/index.ts";
import type { StartGameAction } from "@/engine/types/actionsTypes.ts";
import { drawTile } from "@/engine/domain/tileOperations.ts";
import { cmpTiles } from "@/engine/utils/index.ts";

export const startGameReducer = (
  gameState: GameState,
  action: StartGameAction,
): ActionResult => {
  // Check if game is in the correct phase for adding players
  if (gameState.currentPhase !== GamePhase.WAITING_FOR_PLAYERS) {
    return {
      success: false,
      error: {
        code: GameErrorCodes.NOT_ADDING_PLAYERS,
        message: "Can't add players, game already in progress",
      },
    };
  }
  // Need at least two players
  if (gameState.players.length < MINIMUM_PLAYERS) {
    return {
      success: false,
      error: {
        code: GameErrorCodes.NOT_ENOUGH_PLAYERS,
        message:
          `Can't start game without minimum of ${MINIMUM_PLAYERS} players`,
      },
    };
  }
  if (action.payload.playerName !== gameState.owner) {
    return {
      success: false,
      error: {
        code: GameErrorCodes.INVALID_ACTION,
        message: `Only player ${gameState.owner} can start the game`,
      },
    };
  }
  // Draw initial tiles
  // biome-ignore lint/complexity/noForEach: <explanation>
  gameState.players.forEach((player) => {
    const result = drawTile(gameState.tiles, player.name);
    if (result) {
      const [tile, tiles] = result;
      player.firstTile = tile;
      gameState.tiles = tiles;
    }
  });

  const sortedPlayers = gameState.players.sort((p1, p2) =>
    // biome-ignore lint/style/noNonNullAssertion: all firstTiles were just explicitly set
    cmpTiles(p1.firstTile!, p2.firstTile!)
  );

  gameState.players = sortedPlayers;
  gameState.currentPhase = GamePhase.ACTIVE;
  gameState.currentPlayer = sortedPlayers[0].name;
  gameState.currentTurn = 1;

  return {
    success: true,
    newState: gameState,
  };
};
