import { GameError, GameErrorCodes, MINIMUM_PLAYERS, type Player } from '../types/index.ts';

export const startGameValidation = (players: Player[]): void => {
  if (players.length < MINIMUM_PLAYERS) {
    throw new GameError(
      `Can't start game without minimum of ${MINIMUM_PLAYERS} players`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
};
