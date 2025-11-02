import { foundHotelValidation } from '../domain/index.ts';
import { foundHotelOrchestrator } from '../orchestrators/index.ts';
import {
  type FoundHotelAction,
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
} from '../types/index.ts';

export const foundHotelUseCase = (
  gameState: GameState,
  action: FoundHotelAction,
): GameState => {
  const { player, hotelName } = action.payload;
  const playerId = gameState.players.findIndex((p) => p.name === player);
  if (gameState.currentPlayer !== playerId) {
    throw new GameError(
      'Not your turn',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  if (gameState.currentPhase !== GamePhase.FOUND_HOTEL) {
    throw new GameError(
      'Invalid action',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  // Domain validation
  foundHotelValidation(gameState.foundHotelContext, hotelName, gameState.hotels, gameState.tiles);

  return foundHotelOrchestrator(gameState, hotelName);
};
