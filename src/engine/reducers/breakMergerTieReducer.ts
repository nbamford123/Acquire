import { GameError, GameErrorCodes, GamePhase, type GameState } from '@/engine/types/index.ts';
import type { BreakMergerTieAction } from '@/engine/types/actionsTypes.ts';
import { handleMerger } from '@/engine/state/gameStateUpdater.ts';

export const breakMergerTieReducer = (
  gameState: GameState,
  action: BreakMergerTieAction,
): GameState => {
  const { playerId, resolvedTie } = action.payload;
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
  if (resolvedTie.length !== 2) {
    throw new GameError(
      'Missing hotel names for merger tie break',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  const { survivingHotel, remainingHotels, additionalTiles } = gameState.mergerContext || {};
  if (!remainingHotels) {
    throw new GameError('Invalid merger context', GameErrorCodes.GAME_PROCESSING_ERROR);
  }
  return {
    ...gameState,
    ...handleMerger(remainingHotels, additionalTiles || [], survivingHotel, resolvedTie),
  };
};
