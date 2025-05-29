import { GameError, GameErrorCodes, GamePhase, type GameState } from '@/engine/types/index.ts';
import type { BuySharesAction } from '@/engine/types/actionsTypes.ts';
import { remainingShares, sharePrice } from '@/engine/domain/index.ts';

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
    totalCost += sharePrice(hotel) * numShares;
  });

  const player = gameState.players[playerId];
  if (player.money < totalCost) {
    throw new GameError(
      `You need $${totalCost} to purchase these shares and you only have $${player.money}`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  const nextPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
  // Draw a tile for this player
  // Check for next player dead tiles and draw replacements
  // const playerTiles = filterDefined(player.tiles.map((tile) => {
  //   if (deadTile(tile, gameState)) {
  //     // This might fail because there are no more tiles to draw
  //     const tiles = drawTiles(gameState, playerId, 1);
  //     return tiles.length ? tiles[0] : undefined;
  //   }
  //   return tile;
  // }));
  // return {
  //   ...gameState,
  //   currentPhase: GamePhase.PLAY_TILE,
  //   players: gameState.players.map((p) => p.id === playerId ? { ...p, tiles: playerTiles } : p),
  // };
  return {
    ...gameState,
    currentPhase: GamePhase.PLAY_TILE,
    currentPlayer: nextPlayer,
    currentTurn: nextPlayer === 0 ? gameState.currentTurn + 1 : gameState.currentTurn,
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
    mergerContext: undefined,
    mergerTieContext: undefined,
  };
};
