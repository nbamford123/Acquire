import type { GameState, Hotel } from '../types/index.ts';
import { boardTiles, resolveShares } from '../domain/index.ts';

export const completeMergerReducer = (
  gameState: GameState,
  playerId: number,
  shares: { sell: number; trade: number } | undefined,
  survivor: Hotel,
  merged: Hotel,
): Pick<GameState, 'players' | 'hotels'> => {
  const gameBoard = boardTiles(gameState.tiles);

  const { survivorShares, mergedShares, income } = resolveShares(
    playerId,
    gameBoard,
    survivor,
    merged,
    shares,
  );
  return {
    players: gameState.players.map((player) =>
      player.id === playerId ? { ...player, money: player.money + income } : player
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
