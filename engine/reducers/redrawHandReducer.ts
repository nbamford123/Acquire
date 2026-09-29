import { type GameState, type Tile, TILES_PER_HAND } from '../types/index.ts';
import { boardTiles, drawTiles, getPlayerTiles, updateTiles } from '../domain/index.ts';

// Discards a player's whole hand from the game and draws a new one (as many as the bag allows)
export const redrawHandReducer = (playerId: number, tiles: Tile[]): Pick<GameState, 'tiles'> => {
  const discarded = updateTiles(
    tiles,
    getPlayerTiles(playerId, tiles).map((tile) => ({ ...tile, location: 'dead' as const })),
  );
  return {
    tiles: updateTiles(
      discarded,
      drawTiles(discarded, playerId, boardTiles(discarded), TILES_PER_HAND),
    ),
  };
};
