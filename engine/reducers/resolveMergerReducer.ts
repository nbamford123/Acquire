import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type ResolveMergerAction,
} from '../../shared/types/index.ts';
import {
  assignSharesToPlayer,
  boardTiles,
  remainingShares,
  returnSharesToBank,
  sharePrice,
} from '../domain/index.ts';
import { handleMerger } from '../state/gameStateUpdater.ts';

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

  const { player, shares } = action.payload;
  const playerId = gameState.players.findIndex((p) => p.name === player);
  const mergeContext = gameState.mergeContext!;
  const { survivingHotel, mergedHotel, stockholderIds } = mergeContext ?? {};
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

  let survivorShares = survivor.shares;
  let mergedShares = merged.shares;
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
    survivorShares = assignSharesToPlayer(survivorShares, playerId, tradedShares);
    mergedShares = returnSharesToBank(mergedShares, playerId, shares.trade);
    // remove merged shares we just traded
  }

  const gameBoard = boardTiles(gameState.tiles);

  let playerMoney = gameState.players[playerId].money;
  if (shares.sell) {
    const shareValue = sharePrice(merged, gameBoard) * shares.sell;
    playerMoney = playerMoney + shareValue;
    mergedShares = returnSharesToBank(mergedShares, playerId, shares.sell);
  }

  const updatedGameState = {
    players: gameState.players.map((player) =>
      player.id === playerId ? { ...player, money: playerMoney } : player
    ),
    hotels: gameState.hotels.map((hotel) =>
      hotel.name === survivingHotel
        ? { ...hotel, shares: survivorShares }
        : hotel.name === mergedHotel
        ? { ...hotel, shares: mergedShares }
        : hotel
    ),
  };
  const remainingStockholderIds = stockholderIds.slice(1);
  // Move on to the next stockholer in this merger
  if (remainingStockholderIds.length) {
    return {
      ...gameState,
      ...updatedGameState,
      mergeContext: {
        ...mergeContext,
        stockholderIds: remainingStockholderIds,
      },
    };
  } else if (gameState.mergeContext?.originalHotels.length) {
    // there are more mergers to perform
    const businessLogicChanges = handleMerger(
      updatedGameState.players,
      gameBoard,
      updatedGameState.hotels,
      gameState.mergeContext,
    );
    return {
      ...gameState,
      ...businessLogicChanges,
    };
  } else {
    // Merger(s) complete, move on to buying shares
    return {
      ...gameState,
      ...updatedGameState,
      currentPhase: GamePhase.BUY_SHARES,
      mergeContext: undefined,
    };
  }
};
