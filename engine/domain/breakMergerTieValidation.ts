import { boardTiles, getBoardTile, getHotelsByNames, getMergeContext } from '../domain/index.ts';
import {
  type BreakMergerTieAction,
  GameError,
  GameErrorCodes,
  type GameState,
} from '../types/index.ts';

export const breakMergerTieValidation = (
  action: BreakMergerTieAction,
  gameState: GameState,
): void => {
  if (!action.payload.resolvedTie.survivor || !action.payload.resolvedTie.merged) {
    throw new GameError(
      'Missing hotel names for merger tie break',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  const mergeContext = getMergeContext(gameState);
  const gameBoard = boardTiles(gameState.tiles);
  const { survivingHotel, originalHotels, additionalTiles } = mergeContext;
  const survivor = gameState.hotels.find((hotel) => hotel.name === survivingHotel);
  const otherHotels = getHotelsByNames(gameState.hotels, originalHotels || []);
  const otherTiles = (additionalTiles || []).map((
    tile,
  ) => getBoardTile(gameBoard, tile.row, tile.col));

  if (!survivor || !otherHotels.length || otherTiles.some((tile) => tile === undefined)) {
    throw new GameError(
      `Invalid merger context, couldn't find hotels`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
};
