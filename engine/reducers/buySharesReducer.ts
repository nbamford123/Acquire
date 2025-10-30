import { boardTiles, remainingShares, sharePrice } from '../domain/index.ts';
import {
  type BuySharesAction,
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
} from '../types/index.ts';
import { advancePlayerUseCase } from '../orchestrators/advanceTurnOrchestrator.ts';

// TODO(me): this is a lot of validation, could pull it out
export const buySharesReducer = (
  gameState: GameState,
  action: BuySharesAction,
): GameState => {
  const { player: playerName, shares } = action.payload;
  const playerId = gameState.players.findIndex((p) => p.name === playerName);
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

  return {
    ...gameState,
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
    ...advancePlayerUseCase(gameState),
    mergeContext: undefined,
    mergerTieContext: undefined,
  };
};
