import type { GameState, Hotel, PlayerAction } from '../types/index.ts';
import { boardTiles, resolveShares } from '../domain/index.ts';

export const completeMergerReducer = (
  gameState: GameState,
  playerId: number,
  shares: { sell: number; trade: number } | undefined,
  survivor: Hotel,
  merged: Hotel,
): [Pick<GameState, 'players' | 'hotels'>, PlayerAction[]] => {
  const gameBoard = boardTiles(gameState.tiles);

  const { survivorShares, mergedShares, income, action } = resolveShares(
    playerId,
    gameBoard,
    survivor,
    merged,
    shares,
  );
  return [{
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
  }, [{ turn: gameState.currentTurn, action: `${gameState.players[playerId]} ${action}` }]];
};
