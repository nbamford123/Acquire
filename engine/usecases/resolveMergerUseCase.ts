import { resolveMergerValidation } from '../domain/index.ts';
import { resolveMergerOrchestrator } from '../orchestrators/index.ts';
import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type ResolveMergerAction,
} from '../types/index.ts';

// What happens when a surviving hotel was picked, but there's another tie to be resolved?
export const resolveMergerUseCase = (
  gameState: GameState,
  action: ResolveMergerAction,
): GameState => {
  if (gameState.currentPhase !== GamePhase.RESOLVE_MERGER) {
    throw new GameError('Not resolve merge phase', GameErrorCodes.GAME_INVALID_ACTION);
  }

  const { player, shares } = action.payload;
  const playerId = gameState.players.findIndex((p) => p.name === player);
  // Domain validation
  resolveMergerValidation(
    gameState,
    playerId,
    shares,
  );

  return resolveMergerOrchestrator(
    gameState,
    playerId,
    shares,
  );
};
