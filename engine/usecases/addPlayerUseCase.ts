import { addPlayerValidation, initializePlayer } from '../domain/index.ts';
import {
  type AddPlayerAction,
  GameError,
  GameErrorCodes,
  GamePhase,
  type UseCaseFunction,
} from '../types/index.ts';

export const addPlayerUseCase: UseCaseFunction<AddPlayerAction> = (
  gameState,
  action,
) => {
  const { player } = action.payload;
  // Check if game is in the correct phase for adding players
  if (gameState.currentPhase !== GamePhase.WAITING_FOR_PLAYERS) {
    throw new GameError(
      "Can't add player, game already in progress",
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  // Domain validation
  addPlayerValidation(player, gameState.players);

  const newPlayer = initializePlayer(player);
  return [{
    ...gameState,
    players: [
      ...gameState.players,
      newPlayer,
    ],
  }, [{ turn: 0, action: `Player ${player} joined` }]];
};
