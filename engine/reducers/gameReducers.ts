import { MINIMUM_PLAYERS, TILES_PER_HAND } from '../../shared/types/gameConfig.ts';
import { GameError, GameErrorCodes, GamePhase, type GameState, type Tile } from '@/types/index.ts';
import type { StartGameAction } from '@/types/actionsTypes.ts';
import { drawTiles, updateTiles } from '../domain/index.ts';
import { cmpTiles } from '@/utils/index.ts';

export const startGameReducer = (
  gameState: GameState,
  action: StartGameAction,
): GameState => {
  if (gameState.currentPhase !== GamePhase.WAITING_FOR_PLAYERS) {
    throw new GameError(
      "Can't add players, game already in progress",
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  if (gameState.players.length < MINIMUM_PLAYERS) {
    throw new GameError(
      `Can't start game without minimum of ${MINIMUM_PLAYERS} players`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  if (action.payload.player !== gameState.owner) {
    throw new GameError(
      `Only player ${gameState.owner} can start the game`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  // Draw initial tiles
  let availableTiles: Tile[] = gameState.tiles.filter((tile) => tile.location === 'bag');
  const usedTiles: Tile[] = [];
  const allDrawnTiles: Tile[] = [];

  gameState.players.forEach((player) => {
    // The player id (not yet set) doesn't matter here because we immediately place the tile on the board
    const draw = drawTiles(availableTiles, -1, [], 1);
    const { drawnTiles, remainingTiles } = draw;
    player.firstTile = { row: drawnTiles[0].row, col: drawnTiles[0].col };
    drawnTiles[0].location = 'board';
    usedTiles.push(drawnTiles[0]);
    availableTiles = remainingTiles;
  });

  // Sort the players by first drawn tile and give them an id based on their position
  const sortedPlayers = gameState.players.sort((p1, p2) => cmpTiles(p1.firstTile!, p2.firstTile!))
    .map((p, idx) => ({ ...p, id: idx }));

  // Now draw 6 tiles for each player so they're ready to play
  sortedPlayers.forEach((player) => {
    const draw = drawTiles(availableTiles, player.id, [], TILES_PER_HAND);
    availableTiles = draw.remainingTiles;
    allDrawnTiles.push(...draw.drawnTiles);
  });

  // Create new game state with updated tiles
  const newGameState = {
    ...gameState,
    players: sortedPlayers,
    currentPhase: GamePhase.PLAY_TILE,
    currentPlayer: 0,
    currentTurn: 1,
    tiles: updateTiles(gameState.tiles, [...usedTiles, ...allDrawnTiles]),
  };

  return newGameState;
};
