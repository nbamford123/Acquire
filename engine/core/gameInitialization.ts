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
): Partial<GameState> {
  return {
    gameId,
    owner: ownerId,
    currentPhase: GamePhase.WAITING_FOR_PLAYERS,
    currentTurn: 0,
    tiles: initializeTiles(ROWS, COLS),
    players: [
      initializePlayer(ownerId),
    ],
    hotels: initializeHotels(),
  };
}
