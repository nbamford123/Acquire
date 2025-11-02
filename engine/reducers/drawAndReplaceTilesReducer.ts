import {
  GameError,
  GameErrorCodes,
  type GameState,
  type Player,
  type Tile,
} from '../types/index.ts';
import { boardTiles, deadTile, drawTiles, getPlayerTiles, updateTiles } from '../domain/index.ts';

export const drawAndReplaceTilesReducer = (
  currentPlayerId: number,
  tiles: Tile[],
  players: Player[],
): Partial<GameState> => {
  // Shouldn't be possible, but just in case
  const curPlayerTiles = getPlayerTiles(currentPlayerId, tiles);
  if (curPlayerTiles.length >= 6) {
    throw new GameError(
      `Player ${currentPlayerId} has invalid number of tiles`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  // Draw a tile for this player
  const board = boardTiles(tiles);
  const drawnTiles = drawTiles(
    tiles,
    currentPlayerId,
    board,
    1,
  );
  const updatedTiles = updateTiles(tiles, drawnTiles);
  // Check all players for dead tiles and draw replacements
  const replaceDeadTiles: Tile[] = [];
  for (const player of players) {
    for (const tile of getPlayerTiles(player.id, tiles)) {
      if (deadTile(tile, board)) {
        replaceDeadTiles.push(
          { ...tile, location: 'dead' },
          ...drawTiles(updatedTiles, player.id, board, 1),
        );
      }
    }
  }
  return {
    tiles: updateTiles(updatedTiles, replaceDeadTiles),
  };
};
