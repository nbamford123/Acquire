import {
  type BoardTile,
  type BreakMergerTieAction,
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type HOTEL_NAME,
} from '../../shared/types/index.ts';
import { getHotelsByNames } from '../domain/index.ts';
import { handleMerger } from '../state/gameStateUpdater.ts';
import { boardTiles, getBoardTile } from '../domain/tileOperations.ts';

export const breakMergerTieReducer = (
  gameState: GameState,
  action: BreakMergerTieAction,
): GameState => {
  const { player, resolvedTie } = action.payload;
  const playerId = gameState.players.findIndex((p) => p.name === player);
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
  if (!resolvedTie.survivor || !resolvedTie.merged) {
    throw new GameError(
      'Missing hotel names for merger tie break',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  if (!gameState.mergeContext) {
    throw new GameError(
      'Missing merge context for merger tie break',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  const gameBoard = boardTiles(gameState.tiles);
  const { survivingHotel, originalHotels, additionalTiles } = gameState.mergeContext || {};
  const survivor = gameState.hotels.find((hotel) => hotel.name === survivingHotel);
  const otherHotels = getHotelsByNames(gameState.hotels, originalHotels || []);
  const otherTiles = (additionalTiles || []).map((
    tile,
  ) => getBoardTile(gameBoard, tile.row, tile.col)!);

  if (!survivor || !otherHotels.length || otherTiles.some((tile) => tile === undefined)) {
    throw new GameError(
      `Invalid merger context, couldn't find hotels`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }

  return {
    ...gameState,
    ...handleMerger(
      gameState.players,
      gameBoard,
      gameState.hotels,
      gameState.mergeContext,
      resolvedTie,
    ),
  };
};
