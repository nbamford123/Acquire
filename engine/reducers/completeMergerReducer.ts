import { type GameState, type Hotel } from '../types/index.ts';
import {
  assignSharesToPlayer,
  boardTiles,
  returnSharesToBank,
  sharePrice,
} from '../domain/index.ts';

// reducers/resolveMergerReducer.ts
export const completeMergerReducer = (
  gameState: GameState,
  playerId: number,
  shares: { sell: number; trade: number },
  survivor: Hotel,
  merged: Hotel,
): Pick<GameState, 'players' | 'hotels'> => {
  const gameBoard = boardTiles(gameState.tiles);

  let survivorShares = survivor.shares;
  let mergedShares = merged.shares;
  let playerMoney = gameState.players[playerId].money;

  // Trade shares
  if (shares.trade) {
    const tradedShares = shares.trade / 2;
    survivorShares = assignSharesToPlayer(survivorShares, playerId, tradedShares);
    mergedShares = returnSharesToBank(mergedShares, playerId, shares.trade);
  }

  // Sell shares
  if (shares.sell) {
    const shareValue = sharePrice(merged, gameBoard) * shares.sell;
    playerMoney += shareValue;
    mergedShares = returnSharesToBank(mergedShares, playerId, shares.sell);
  }

  return {
    players: gameState.players.map((player) =>
      player.id === playerId ? { ...player, money: playerMoney } : player
    ),
    hotels: gameState.hotels.map((hotel) =>
      hotel.name === survivor.name
        ? { ...hotel, shares: survivorShares }
        : hotel.name === merged.name
        ? { ...hotel, shares: mergedShares }
        : hotel
    ),
  };
};
