import {
  type BreakMergerTieAction,
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
} from '../types/index.ts';
import { breakMergerTieValidation } from '../domain/breakMergerTieValidation.ts';
import { processMergerOrchestrator } from '../orchestrators/processMergerOrchestrator.ts';

export const breakMergerTieUseCase = (
  gameState: GameState,
  action: BreakMergerTieAction,
): GameState => {
  // TODO(me): this should be an id in action, not a player name
  const { player, resolvedTie } = action.payload;
  const playerId = gameState.players.findIndex((p) => p.name === player);

  // Orchestrate validations
  if (gameState.currentPlayer !== playerId) {
    throw new GameError(
      'Not your turn',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  if (gameState.currentPhase !== GamePhase.BREAK_MERGER_TIE) {
    throw new GameError(
      'Invalid action',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  if (!gameState.mergeContext) {
    throw new GameError('Missing merge context', GameErrorCodes.GAME_INVALID_ACTION);
  }

  breakMergerTieValidation(
    action,
    gameState.mergeContext,
    gameState.tiles,
    gameState.hotels,
  );

  return processMergerOrchestrator(
    gameState,
    gameState.mergeContext,
    resolvedTie,
  );
};
