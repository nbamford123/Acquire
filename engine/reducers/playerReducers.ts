import { GameError, GameErrorCodes, GamePhase, type GameState } from '@/types/index.ts';
import { MAX_PLAYERS, RESERVED_NAMES } from '@/types/gameConfig.ts';
import type { AddPlayerAction, RemovePlayerAction } from '@/types/actionsTypes.ts';
import { initializePlayer } from '../domain/index.ts';

export const addPlayerReducer = (
  gameState: GameState,
  action: AddPlayerAction,
): GameState => {
  const { player } = action.payload;
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
  if (!player || player.trim() === '') {
    throw new GameError('Player name cannot be empty', GameErrorCodes.GAME_INVALID_ACTION);
  }

  // Check for reserved words
  if (RESERVED_NAMES.includes(player)) {
    throw new GameError(
      `${player} is a reserved word, please choose another`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  // Check for player name length
  if (player.length > 20) {
    throw new GameError(
      'Player name must be less than 20 characters',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  // Check for existing player with the same name
  if (gameState.players.some((p) => p.name === player)) {
    throw new GameError(
      'A player with this name already exists',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  const newPlayer = initializePlayer(player);
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
