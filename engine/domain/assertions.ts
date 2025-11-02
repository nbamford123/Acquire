import {
  type BoardTile,
  type FoundHotelContext,
  GameError,
  GameErrorCodes,
  type GameState,
  type Hotel,
  type MergeContext,
} from '../types/index.ts';
import { getTileLabel } from '../utils/index.ts';

export const getFoundHotelContext = (gameState: GameState): FoundHotelContext => {
  if (!gameState.foundHotelContext) {
    throw new GameError('Missing foundHotel context', GameErrorCodes.GAME_INVALID_ACTION);
  }
  return gameState.foundHotelContext;
};

export const getMergeContext = (gameState: GameState): MergeContext => {
  if (!gameState.mergeContext) {
    throw new GameError('Missing merge context', GameErrorCodes.GAME_INVALID_ACTION);
  }
  return gameState.mergeContext;
};

export const getHotelByName = (hotels: Hotel[], name: string): Hotel => {
  const hotel = hotels.find((h) => h.name === name);
  if (!hotel) {
    throw new GameError(`Hotel not found: ${name}`, GameErrorCodes.GAME_PROCESSING_ERROR);
  }
  return hotel;
};

export const getBoardTile = (tiles: BoardTile[], row: number, col: number) => {
  const tile = tiles.find((tile) => tile.row === row && tile.col === col);
  if (!tile) {
    throw new GameError(
      `Tile not found: ${getTileLabel({ row, col })}`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  return tile;
};
