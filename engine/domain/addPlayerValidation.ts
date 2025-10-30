import {
  GameError,
  GameErrorCodes,
  MAX_PLAYERS,
  type Player,
  RESERVED_NAMES,
} from '../types/index.ts';

export const addPlayerValidation = (playerName: string, players: Player[]): void => {
  // Check if maximum number of players has been reached
  if (players.length >= MAX_PLAYERS) {
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
  if (players.some((p) => p.name === playerName)) {
    throw new GameError(
      'A player with this name already exists',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
};
