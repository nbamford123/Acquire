import { GameError, GameErrorCodes, GamePhase, type GameState } from '@/engine/types/index.ts';
import { MAX_PLAYERS, RESERVED_NAMES } from '@/engine/config/gameConfig.ts';
import type { AddPlayerAction, RemovePlayerAction } from '@/engine/types/actionsTypes.ts';
import { initializePlayer } from '@/engine/domain/index.ts';

export const addPlayerReducer = (
  gameState: GameState,
  action: AddPlayerAction,
): GameState => {
  const { playerName } = action.payload;
  // Check if game is in the correct phase for adding players
  if (gameState.currentPhase !== GamePhase.WAITING_FOR_PLAYERS) {
    throw new GameError(
      "Can't add player, game already in progress",
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  // Check if maximum number of players has been reached
  if (gameState.players.length >= MAX_PLAYERS) {
    throw new GameError(
      `Game already has maximum of ${MAX_PLAYERS} players`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  // Check for empty player name
  if (!playerName || playerName.trim() === '') {
    throw new GameError('Player name cannot be empty', GameErrorCodes.GAME_INVALID_ACTION);
  }

  // Check for reserved words
  if (RESERVED_NAMES.includes(playerName)) {
    throw new GameError(
      `${playerName} is a reserved word, please choose another`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  // Check for player name length
  if (playerName.length > 20) {
    throw new GameError(
      'Player name must be less than 20 characters',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  // Check for existing player with the same name
  if (gameState.players.some((player) => player.name === playerName)) {
    throw new GameError(
      'A player with this name already exists',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  const newPlayer = initializePlayer(playerName);
  return {
    ...gameState,
    players: [
      ...gameState.players,
      newPlayer,
    ],
  };
};

export const removePlayerReducer = (
  gameState: GameState,
  _action: RemovePlayerAction,
): GameState => {
  // Implementation for removing a player
  // For now, just return success with unchanged state
  return gameState;
};
