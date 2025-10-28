import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type Player,
  type Tile,
} from '../types/index.ts';
import { boardTiles, deadTile, drawTiles, getPlayerTiles, updateTiles } from '../domain/index.ts';

// This may be a problem with playTileReducer because we're modifying gameState.tiles
export const advanceTurnUseCase = (
  currentPlayerId: number,
  tiles: Tile[],
  players: Player[],
  currentTurn: number,
): Partial<GameState> => {
  const gameBoard = boardTiles(tiles);

  const curPlayerTiles = getPlayerTiles(currentPlayerId, tiles);
  // Shouldn't be possible, but just in case
  if (curPlayerTiles.length >= 6) {
    throw new GameError(
      `Player ${currentPlayerId} has invalid number of tiles`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }

  // Draw a tile for this player
  const availableTiles = tiles.filter((tile) => tile.location === 'bag');
  let { remainingTiles, deadTiles, drawnTiles } = drawTiles(
    availableTiles,
    currentPlayerId,
    gameBoard,
    1,
  );
  // Check all players for dead tiles and draw replacements
  for (const player of players) {
    for (const tile of getPlayerTiles(player.id, tiles)) {
      if (deadTile(tile, gameBoard)) {
        const tiles = drawTiles(remainingTiles, player.id, gameBoard, 1);
        remainingTiles = tiles.remainingTiles;
        deadTiles.push(tile);
        drawnTiles.push(...tiles.drawnTiles);
      }
    }
  }
  const nextPlayerId = (currentPlayerId + 1) % players.length;
  return {
    currentPhase: GamePhase.PLAY_TILE,
    currentPlayer: nextPlayerId,
    currentTurn: nextPlayerId === 0 ? currentTurn + 1 : currentTurn,
    tiles: updateTiles(tiles, [
      ...drawnTiles,
      ...deadTiles,
    ]),
  };
};
