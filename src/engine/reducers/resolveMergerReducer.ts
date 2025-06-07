import { GameError, GameErrorCodes, GamePhase, type GameState } from '@/engine/types/index.ts';
import type { ResolveMergerAction } from '@/engine/types/actionsTypes.ts';
import { remainingShares, sharePrice } from '@/engine/domain/index.ts';
import { filterDefined } from '@/engine/utils/filterDefined.ts';
import { sharePrice } from '@/engine/domain/hotelOperations.ts';

// What happens when a surviving hotel was picked, but there's another tie to be resolved?
export const resolveMergerReducer = (
  gameState: GameState,
  action: ResolveMergerAction,
): GameState => {
  if (gameState.currentPhase !== GamePhase.RESOLVE_MERGER) {
    throw new GameError(
      'Not resolve merge phase',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }

  const { playerId, shares } = action.payload;
  const { survivingHotel, mergedHotel, stockholders } = gameState.mergerContext ?? {};
  if (!stockholders || !survivingHotel || !mergedHotel || !shares) {
    throw new GameError('Invalid hotel merger context', GameErrorCodes.GAME_PROCESSING_ERROR);
  }
  if (!stockholders.length || stockholders[0] === playerId) {
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
  let tradedShares = 0; // this is how many they get
  // We should probably check the player has the shares to do these actions, too
  if (shares.trade) {
    if (shares.trade % 2 !== 0) {
      throw new GameError(
        `You can only trade an even number of shares`,
        GameErrorCodes.GAME_INVALID_ACTION,
      );
    }
    tradedShares = shares.trade / 2;
    if (remainingShares(survivor) < tradedShares) {
      throw new GameError(
        `${survivingHotel} doesn't have ${tradedShares} shares left to trade`,
        GameErrorCodes.GAME_INVALID_ACTION,
      );
      // Can add the survivor shares to player now (and away from bank), but we still have to process sell
    }
    if (shares.sell) {
      const shareValue = sharePrice(merged) * shares.sell;
      // add to player money and return this many shares to the bank
    }
  }
  // bump the player id if there are more, otherwise phase becomes buy shares and all this context gets cleared, also wipe out the merged hotel
  return {
    ...gameState,
    mergerContext: {
      ...gameState.mergerContext,
      stockholders: stockholders.slice(0,1),
    }
  }
};
