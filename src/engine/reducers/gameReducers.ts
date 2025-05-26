import { MINIMUM_PLAYERS } from '@/engine/config/gameConfig.ts';
import { GameError, GameErrorCodes, GamePhase, type GameState } from '@/engine/types/index.ts';
import type {
  BuySharesAction,
  PlayerTurnAction,
  PlayTileAction,
  StartGameAction,
} from '@/engine/types/actionsTypes.ts';
import {
  board,
  deadTile,
  drawTiles,
  findHotel,
  remainingShares,
  sharePrice,
} from '@/engine/domain/index.ts';
import { cmpTiles, getAdjacentPositions } from '@/engine/utils/index.ts';

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
  if (action.payload.playerName !== gameState.owner) {
    throw new GameError(
      `Only player ${gameState.owner} can start the game`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  // Draw initial tiles
  gameState.players.forEach((player) => {
    // The player id (not yet set) doesn't matter here because we immediately place the tile on the board
    const firstTile = drawTiles(gameState, -1, 1)[0];
    player.firstTile = firstTile;
    firstTile.location = 'board';
  });

  // Sort the players by first drawn tile and give them an id based on their position
  const sortedPlayers = gameState.players.sort((p1, p2) => cmpTiles(p1.firstTile!, p2.firstTile!))
    .map((p, idx) => ({ ...p, id: idx }));

  // Now draw 6 tiles for each player so they're ready to play
  // This could have been done in the above loop, but when we play in person we always do the individual
  // tiles first. It's a tradition
  sortedPlayers.forEach((player) => player.tiles = drawTiles(gameState, player.id, 6));

  gameState.players = sortedPlayers;
  gameState.currentPhase = GamePhase.PLAYER_TURN;
  gameState.currentPlayer = 0;
  gameState.currentTurn = 1;

  return gameState;
};

export const playerTurnReducer = (
  gameState: GameState,
  action: PlayerTurnAction,
): GameState => {
  const { playerId } = action.payload;
  const player = gameState.players[playerId];
  // Check for dead tiles and replace
  const playerTiles = player.tiles.map((tile) => {
    if (deadTile(tile, gameState)) {
      return drawTiles(gameState, playerId, 1);
    }
    return tile;
  });
  return { ...gameState, currentPhase: GamePhase.PLAY_TILE };
};

