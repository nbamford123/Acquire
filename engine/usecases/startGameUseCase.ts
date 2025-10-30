import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type StartGameAction,
} from '../types/index.ts';
import { startGameValidation } from '../domain/index.ts';
import { startGameReducer } from '../reducers/startGameReducers.ts';

export const startGameUseCase = (
  gameState: GameState,
  action: StartGameAction,
): GameState => {
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

  // Create new game state with updated tiles
  const newGameState = {
    ...gameState,
    currentPhase: GamePhase.PLAY_TILE,
    currentPlayer: 0,
    currentTurn: 1,
    ...startGameReducer(gameState.tiles, gameState.players),
  };

  return newGameState;
};
