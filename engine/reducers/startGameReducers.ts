import { drawInitialTiles, drawTiles, startGameValidation, updateTiles } from '../domain/index.ts';
import { type GameState, type Player, type Tile, TILES_PER_HAND } from '../types/index.ts';

export const startGameReducer = (
  tiles: Tile[],
  players: Player[],
): Partial<GameState> => {
  const { sortedPlayers, updatedTiles } = drawInitialTiles(tiles, players);

  let usedTiles = updatedTiles;
  // Now draw 6 tiles for each player so they're ready to play
  for (const player of sortedPlayers) {
    usedTiles = drawTiles(usedTiles, player.id, [], TILES_PER_HAND);
  }
  return {
    players: sortedPlayers,
    tiles: usedTiles,
  };
};
