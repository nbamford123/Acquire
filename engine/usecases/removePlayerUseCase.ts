import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type RemovePlayerAction,
  type UseCaseFunction,
} from '../types/index.ts';

export const removePlayerUseCase: UseCaseFunction<RemovePlayerAction> = (
  gameState,
  action,
) => {
  const { player } = action.payload;
  // Check if game is in the correct phase for removing players
  if (gameState.currentPhase !== GamePhase.WAITING_FOR_PLAYERS) {
    throw new GameError(
      "Can't remove player, game already in progress",
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  // The owner deletes the game instead
  if (player === gameState.owner) {
    throw new GameError(
      "The owner can't leave the game; delete it instead",
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

  return [{
    ...gameState,
    players: gameState.players.filter((p) => p.name !== player),
  }, [{ turn: gameState.currentTurn, action: `${player} left the game` }]];
};
