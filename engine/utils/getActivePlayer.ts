import { GamePhase, type GameState } from '../types/index.ts';

// The player who needs to act next: the next stockholder while resolving a merger, otherwise the
// current player
export const getActivePlayer = (
  gameState: Pick<GameState, 'currentPhase' | 'currentPlayer' | 'mergeContext'>,
): number =>
  gameState.currentPhase === GamePhase.RESOLVE_MERGER
    ? gameState.mergeContext?.stockholderIds?.[0] ?? gameState.currentPlayer
    : gameState.currentPlayer;
