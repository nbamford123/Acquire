import { updateTiles } from '../domain/index.ts';
import type { BoardTile, GameState, HOTEL_NAME } from '../types/index.ts';

export const growHotelReducer = (
  gameState: GameState,
  hotel: HOTEL_NAME,
  playedTile: BoardTile,
  additionalTiles: BoardTile[],
): GameState => {
  return {
    ...gameState,
    tiles: updateTiles(gameState.tiles, [
      { ...playedTile, hotel },
      ...additionalTiles.map((tile) => ({
        ...tile,
        hotel,
      })),
    ]),
  };
};
