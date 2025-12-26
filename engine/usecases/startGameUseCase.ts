import { startGameValidation } from '../domain/index.ts';
import { startGameOrchestrator } from '../orchestrators/index.ts';
import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type StartGameAction,
  type UseCaseFunction,
} from '../types/index.ts';

export const startGameUseCase: UseCaseFunction<StartGameAction> = (
  gameState,
  action,
) => {
  if (gameState.currentPhase !== GamePhase.WAITING_FOR_PLAYERS) {
    throw new GameError(
      "Can't add players, game already in progress",
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  if (action.payload.player !== gameState.owner) {
    throw new GameError(
      `Only player ${gameState.owner} can start the game`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  // Domain validation
  startGameValidation(gameState.players);

  return startGameOrchestrator(gameState);
};
