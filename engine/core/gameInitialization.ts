import { GamePhase, type GameState } from '@/types/index.ts';
import { COLS, ROWS } from '../../shared/types/gameConfig.ts';
import { initializeHotels, initializePlayer, initializeTiles } from '../domain/index.ts';

/**
 * Creates a new game with the specified parameters
 * Note: gameId is provided by the service layer
 */
export function initializeGame(
  gameId: string,
  ownerId: string,
): GameState {
  return {
    gameId,
    owner: ownerId,
    currentPhase: GamePhase.WAITING_FOR_PLAYERS,
    currentTurn: 0,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [
      initializePlayer(ownerId),
    ],
    hotels: initializeHotels(),
    tiles: initializeTiles(ROWS, COLS),
  };
}
