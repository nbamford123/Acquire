import {
  type ActionResult,
  GameErrorCodes,
  type GameState,
  GamePhase,
} from "@/engine/types/index.ts";
import {
  INITIAL_PLAYER_MONEY,
  MAX_PLAYERS,
} from "@/engine/config/gameConfig.ts";
import type {
  AddPlayerAction,
  RemovePlayerAction,
} from "@/engine/types/actionsTypes.ts";

export const addPlayerReducer = (
  gameState: GameState,
  action: AddPlayerAction,
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
  
  // Check if maximum number of players has been reached
  if (gameState.players.length >= MAX_PLAYERS) {
    return {
      success: false,
      error: {
        code: GameErrorCodes.PLAYERS_MAX,
        message: `Game already has maximum of ${MAX_PLAYERS} players`,
      },
    };
  }
  
  // Check for empty player name
  if (!action.payload.playerName || action.payload.playerName.trim() === "") {
    return {
      success: false,
      error: {
        code: GameErrorCodes.INVALID_PLAYER_NAME,
        message: "Player name cannot be empty",
      },
    };
  }
  
  // Check for player name length
  if (action.payload.playerName.length > 20) {
    return {
      success: false,
      error: {
        code: GameErrorCodes.INVALID_PLAYER_NAME,
        message: "Player name must be less than 20 characters",
      },
    };
  }
  
  // Check for existing player with the same name
  if (gameState.players.some(player => player.name === action.payload.playerName)) {
    return {
      success: false,
      error: {
        code: GameErrorCodes.PLAYER_EXISTS,
        message: "A player with this name already exists",
      },
    };
  }
  return {
    success: true,
    newState: {
      ...gameState,
      players: [
        ...gameState.players,
        {
          name: action.payload.playerName,
          money: INITIAL_PLAYER_MONEY,
        },
      ],
    },
  };
};

export const removePlayerReducer = (
  gameState: GameState,
  _action: RemovePlayerAction,
): ActionResult => {
  // Implementation for removing a player
  // For now, just return success with unchanged state
  return {
    success: true,
    newState: gameState
  };
};
