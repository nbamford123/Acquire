import {
  GameError,
  GameErrorCodes,
  type GameState,
  type Hotel,
  type PlayerAction,
} from '../types/index.ts';
import { getMergeContext, resolveShares } from '../domain/index.ts';

export const completeMergerReducer = (
  gameState: GameState,
  playerId: number,
  shares: { sell: number; trade: number } | undefined,
  survivor: Hotel,
  merged: Hotel,
): [Pick<GameState, 'players' | 'hotels'>, PlayerAction[]] => {
  const { mergedHotelSize } = getMergeContext(gameState);
  if (mergedHotelSize === undefined) {
    throw new GameError('Missing merged hotel size', GameErrorCodes.GAME_PROCESSING_ERROR);
  }

  const { survivorShares, mergedShares, income, action } = resolveShares(
    playerId,
    mergedHotelSize,
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
  }, [{ turn: gameState.currentTurn, action: `${gameState.players[playerId].name} ${action}` }]];
};
