import { type GameState, type Player, type Tile, TILES_PER_HAND } from '../types/index.ts';
import { boardTiles, deadTile, drawTiles, getPlayerTiles, updateTiles } from '../domain/index.ts';

// End of turn: refill the current player's hand, then replace any tiles in any hand that can
// never be played
export const drawAndReplaceTilesReducer = (
  currentPlayerId: number,
  tiles: Tile[],
  players: Player[],
): Pick<GameState, 'tiles'> => {
  let updatedTiles = tiles;
  // Usually one tile, none if the player skipped placing a tile
  const missing = TILES_PER_HAND - getPlayerTiles(currentPlayerId, updatedTiles).length;
  if (missing > 0) {
    updatedTiles = updateTiles(
      updatedTiles,
      drawTiles(updatedTiles, currentPlayerId, boardTiles(updatedTiles), missing),
    );
  }
  const board = boardTiles(updatedTiles);
  for (const player of players) {
    for (const tile of getPlayerTiles(player.id, updatedTiles)) {
      if (deadTile(tile, board)) {
        // Draw from the updated bag each time so two replacements can't draw the same tile
        updatedTiles = updateTiles(updatedTiles, [{ ...tile, location: 'dead' }]);
        updatedTiles = updateTiles(updatedTiles, drawTiles(updatedTiles, player.id, board, 1));
      }
    }
  }
  return { tiles: updatedTiles };
};
