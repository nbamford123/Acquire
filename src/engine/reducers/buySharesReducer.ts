import { GameError, GameErrorCodes, GamePhase, type GameState } from '@/engine/types/index.ts';
import type { BuySharesAction } from '@/engine/types/actionsTypes.ts';
import {
  boardTiles,
  deadTile,
  drawTiles,
  getPlayerTiles,
  remainingShares,
  sharePrice,
  updateTiles,
} from '@/engine/domain/index.ts';
import { filterDefined } from '@/engine/utils/filterDefined.ts';

export const buySharesReducer = (
  gameState: GameState,
  action: BuySharesAction,
): GameState => {
  const { playerId, shares } = action.payload;
  if (gameState.currentPlayer !== playerId) {
    throw new GameError(
      'Not your turn',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  if (gameState.currentPhase !== GamePhase.BUY_SHARES) {
    throw new GameError(
      'Invalid action',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  if (Object.values(shares).reduce((total, numShares) => total + numShares, 0) > 3) {
    throw new GameError(
      'Only 3 shares may be purchased per turn',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  const gameBoard = boardTiles(gameState.tiles);
  let totalCost = 0;
  Object.entries(shares).forEach(([hotelName, numShares]) => {
    if (numShares === 0) {
      throw new GameError(
        `Can't buy zero shares in hotel ${hotelName}`,
        GameErrorCodes.GAME_INVALID_ACTION,
      );
    }
    const hotel = gameState.hotels.find((h) => h.name === hotelName);
    if (!hotel) {
      throw new GameError(`Hotel ${hotelName} doesn't exist`, GameErrorCodes.GAME_INVALID_ACTION);
    }
    if (remainingShares(hotel) < numShares) {
      throw new GameError(
        `Hotel ${hotelName} doesn't have enough shares`,
        GameErrorCodes.GAME_INVALID_ACTION,
      );
    }
    totalCost += sharePrice(hotel, gameBoard) * numShares;
  });

  const player = gameState.players[playerId];
  if (player.money < totalCost) {
    throw new GameError(
      `You need $${totalCost} to purchase these shares and you only have $${player.money}`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  // Draw a tile for this player
  const availableTiles = gameState.tiles.filter((tile) => tile.location === 'bag');
  // Should we somehow determine they have 5? Or maybe less, if the bag is empty, but then draw is going to return 0 anyway
  if (getPlayerTiles(playerId, gameState.tiles).length >= 6) {
    throw new GameError(
      `Player ${playerId} has invalid number of tiles`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  const playerTiles = drawTiles(availableTiles, playerId, gameBoard, 1);
  // Check for next player dead tiles and draw replacements-- it's possible not enough
  // will be left to replace all dead tiles, so filter undefined out
  let { remainingTiles, deadTiles } = playerTiles;
  const nextPlayerId = (gameState.currentPlayer + 1) % gameState.players.length;
  const nextPlayerTiles = filterDefined(
    getPlayerTiles(nextPlayerId, gameState.tiles).map((tile) => {
      if (deadTile(tile, gameBoard)) {
        // This might fail because there are no more tiles to draw
        const tiles = drawTiles(remainingTiles, nextPlayerId, gameBoard, 1);
        remainingTiles = tiles.remainingTiles;
        deadTiles.concat(tiles.deadTiles);
        return tiles.drawnTiles.length ? tiles.drawnTiles[0] : undefined;
      }
      return tile;
    }),
  );

  return {
    ...gameState,
    currentPhase: GamePhase.PLAY_TILE,
    currentPlayer: nextPlayerId,
    currentTurn: nextPlayerId === 0 ? gameState.currentTurn + 1 : gameState.currentTurn,
    hotels: gameState.hotels.map((hotel) => {
      const numShares = shares[hotel.name];
      if (!numShares) return hotel;
      let limit = numShares;
      return {
        ...hotel,
        shares: hotel.shares.map((share) => {
          if (limit > 0 && share.location === 'bank') {
            limit--;
            return { ...share, location: playerId };
          } else {
            return share;
          }
        }),
      };
    }),
    players: gameState.players.map((player) =>
      player.id === playerId ? { ...player, money: player.money - totalCost } : player
    ),
    // Of course nextplayer tiles may be unaltered, but no harm in just updating them anyway
    tiles: updateTiles(gameState.tiles, [
      ...playerTiles.drawnTiles,
      ...deadTiles,
      ...nextPlayerTiles,
    ]),
    mergeContext: undefined,
    mergerTieContext: undefined,
  };
};
