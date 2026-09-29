import { boardTiles, getBoardTile, getHotelsByNames, getMergeContext } from '../domain/index.ts';
import {
  type BreakMergerTieAction,
  GameError,
  GameErrorCodes,
  type GameState,
} from '../types/index.ts';

// Checks the tie resolution against the current tie; mergeHotels checks the merged hotel is one
// of the largest remaining hotels.
export const breakMergerTieValidation = (
  action: BreakMergerTieAction,
  gameState: GameState,
): void => {
  const { survivor, merged } = action.payload.resolvedTie;
  if (!survivor || !merged) {
    throw new GameError(
      'Missing hotel names for merger tie break',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  if (survivor === merged) {
    throw new GameError(
      'Surviving and merged hotels must be different',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  const mergeContext = getMergeContext(gameState);
  const tiedHotels = gameState.mergerTieContext?.tiedHotels;
  if (!tiedHotels?.length) {
    throw new GameError('Missing merger tie context', GameErrorCodes.GAME_PROCESSING_ERROR);
  }
  const { survivingHotel, originalHotels, additionalTiles } = mergeContext;
  if (survivingHotel) {
    // Survivor already decided, the tie is over which hotel merges next
    if (survivor !== survivingHotel) {
      throw new GameError(
        `${survivingHotel} is already the surviving hotel`,
        GameErrorCodes.GAME_INVALID_ACTION,
      );
    }
    if (!tiedHotels.includes(merged)) {
      throw new GameError(
        `Merged hotel must be one of ${tiedHotels.join(', ')}`,
        GameErrorCodes.GAME_INVALID_ACTION,
      );
    }
  } else {
    if (!tiedHotels.includes(survivor)) {
      throw new GameError(
        `Surviving hotel must be one of ${tiedHotels.join(', ')}`,
        GameErrorCodes.GAME_INVALID_ACTION,
      );
    }
    if (!originalHotels.includes(merged)) {
      throw new GameError(
        `${merged} is not part of this merger`,
        GameErrorCodes.GAME_INVALID_ACTION,
      );
    }
  }

  // Throws if either hotel is missing from state
  getHotelsByNames(gameState.hotels, [survivor, merged]);
  const gameBoard = boardTiles(gameState.tiles);
  (additionalTiles || []).forEach((tile) => getBoardTile(gameBoard, tile.row, tile.col));
};
