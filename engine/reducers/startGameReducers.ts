import { drawInitialTiles, updateTiles } from '../domain/index.ts';
import { shuffleTiles } from '../utils/index.ts';
import { type GameState, type Player, type Tile, TILES_PER_HAND } from '../types/index.ts';

export const startGameReducer = (
  tiles: Tile[],
  players: Player[],
): Partial<GameState> => {
  const { sortedPlayers, playedTiles } = drawInitialTiles(tiles, players);

  const updatedTiles = updateTiles(tiles, playedTiles);
  const shuffledTiles = shuffleTiles(updatedTiles.filter((tile) => tile.location === 'bag'));
  const drawnTiles: Tile[] = [];
  // Now draw 6 tiles for each player so they're ready to play
  for (const player of sortedPlayers) {
    const playerTiles = shuffledTiles.splice(0, TILES_PER_HAND).map((tile) => ({
      ...tile,
      location: player.id,
    }));
    drawnTiles.push(...playerTiles);
  }
  return {
    players: sortedPlayers,
    tiles: updateTiles(updatedTiles, drawnTiles),
  };
};
