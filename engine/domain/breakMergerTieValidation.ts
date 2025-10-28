import {
  type BreakMergerTieAction,
  GameError,
  GameErrorCodes,
  type Hotel,
  MergeContext,
  type Tile
} from '../types/index.ts';
import { getHotelsByNames } from '../domain/index.ts';
import { boardTiles, getBoardTile } from '../domain/tileOperations.ts';

export const breakMergerTieValidation = (
  action: BreakMergerTieAction,
  mergeContext: MergeContext,
  tiles: Tile[],
  hotels: Hotel[],
): void => {
  if (!action.payload.resolvedTie.survivor || !action.payload.resolvedTie.merged) {
    throw new GameError(
      'Missing hotel names for merger tie break',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  const gameBoard = boardTiles(tiles);
  const { survivingHotel, originalHotels, additionalTiles } = mergeContext;
  const survivor = hotels.find((hotel) => hotel.name === survivingHotel);
  const otherHotels = getHotelsByNames(hotels, originalHotels || []);
  const otherTiles = (additionalTiles || []).map((
    tile,
  ) => getBoardTile(gameBoard, tile.row, tile.col)!);

  if (!survivor || !otherHotels.length || otherTiles.some((tile) => tile === undefined)) {
    throw new GameError(
      `Invalid merger context, couldn't find hotels`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
};
