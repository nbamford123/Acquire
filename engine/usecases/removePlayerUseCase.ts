import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type RemovePlayerAction,
} from '../types/index.ts';
import { addPlayerValidation } from '../domain/index.ts';

export const removePlayerUseCase = (
  gameState: GameState,
  action: RemovePlayerAction,
): GameState => {
  const { player } = action.payload;
  // Check if game is in the correct phase for removing players
  if (gameState.currentPhase !== GamePhase.WAITING_FOR_PLAYERS) {
    throw new GameError(
      "Can't remove player, game already in progress",
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  // Domain validation
  if (!gameState.players.find((p) => p.name === player)) {
    throw new GameError(
      `Player ${player} doesn't exist in game`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  return {
    ...gameState,
    players: gameState.players.filter((p) => p.name !== player),
  };
};
