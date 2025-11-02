import { getMergeContext, remainingShares } from './index.ts';
import { GameError, GameErrorCodes, type GameState, type Hotel } from '../types/index.ts';

export const resolveMergerValidation = (
  gameState: GameState,
  playerId: number,
  shares: { sell: number; trade: number } | undefined,
): { merged: Hotel; survivor: Hotel; stockholderIds: number[] } => {
  const mergeContext = getMergeContext(gameState);
  const { survivingHotel, mergedHotel, stockholderIds } = mergeContext;
  if (!stockholderIds || !survivingHotel || !mergedHotel || !shares) {
    throw new GameError('Invalid hotel merger context', GameErrorCodes.GAME_PROCESSING_ERROR);
  }
  if (!stockholderIds.length || stockholderIds[0] !== playerId) {
    throw new GameError('Invalid player id for merger', GameErrorCodes.GAME_PROCESSING_ERROR);
  }
  const survivor = gameState.hotels.find((h) => h.name === survivingHotel);
  const merged = gameState.hotels.find((h) => h.name === mergedHotel);
  if (!survivor || !merged) {
    throw new GameError(
      `Invalid merge hotel name(s): ${survivingHotel},${mergedHotel}`,
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  const playerMergedShares = merged.shares.filter((share) => share.location === playerId);
  if (playerMergedShares.length < shares.trade + shares.sell) {
    throw new GameError(
      `You don't have ${shares.trade + shares.sell} shares in ${mergedHotel} to trade/sell`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  if (shares.trade) {
    if (shares.trade % 2 !== 0) {
      throw new GameError(
        `You can only trade an even number of shares`,
        GameErrorCodes.GAME_INVALID_ACTION,
      );
    }
    const tradedShares = shares.trade / 2;
    if (remainingShares(survivor) < tradedShares) {
      throw new GameError(
        `${survivingHotel} doesn't have ${tradedShares} shares left to trade`,
        GameErrorCodes.GAME_INVALID_ACTION,
      );
    }
  }
  return { merged, survivor, stockholderIds };
};
