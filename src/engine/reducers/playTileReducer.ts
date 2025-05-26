import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type Hotel,
} from '@/engine/types/index.ts';
import type { PlayTileAction, Tile } from '@/engine/types/index.ts';
import { board, findHotel, mergeHotels, replaceTile } from '@/engine/domain/index.ts';
import { getAdjacentPositions } from '@/engine/utils/index.ts';

const validatePlayTileAction = (gameState: GameState, action: PlayTileAction) => {
  const { playerId, tile } = action.payload;

  if (gameState.currentPlayer !== playerId) {
    throw new GameError('Not your turn', GameErrorCodes.GAME_INVALID_ACTION);
  }

  if (gameState.currentPhase !== GamePhase.PLAY_TILE) {
    throw new GameError('Invalid action', GameErrorCodes.GAME_INVALID_ACTION);
  }

  if (tile.location !== playerId) {
    throw new GameError('Not your tile', GameErrorCodes.GAME_INVALID_ACTION);
  }
};

const determinePlayTileOutcome = (
  tile: Tile,
  gameBoard: Tile[][],
  hotels: Hotel[],
) => {
  const adjacentPositions = getAdjacentPositions(tile.row, tile.col);
  const adjacentHotels = adjacentPositions
    .map(([r, c]) => findHotel(gameBoard[r][c], hotels))
    .filter(Boolean) as Hotel[];

  if (adjacentHotels.length >= 2) {
    return { type: 'MERGER', adjacentHotels };
  }

  if (adjacentHotels.length === 1) {
    return { type: 'EXTEND_HOTEL', hotel: adjacentHotels[0] };
  }

  const adjacentTiles = adjacentPositions
    .map(([r, c]) => gameBoard[r][c])
    .filter(Boolean);

  if (adjacentTiles.length > 0) {
    return { type: 'FOUND_HOTEL', adjacentTiles };
  }

  return { type: 'SIMPLE_PLACEMENT' };
};

const handleMerger = (
  gameState: GameState,
  adjacentHotels: Hotel[],
  tile: Tile,
  resolvedTies: [string, string][],
): Partial<GameState> => {
  const result = mergeHotels(adjacentHotels, tile, resolvedTies);

  if (result.needsMergeOrder) {
    return {
      currentPhase: GamePhase.BREAK_MERGER_TIE,
      pendingPlayerId: gameState.currentPlayer,
      mergerTieContext: {
        breakTie: [result.hotel1.name, result.hotel2.name],
        resolvedTies,
      },
    };
  }
  const { survivingHotel, mergedHotels } = result;
  return {
    ...gameState,
    currentPhase: GamePhase.RESOLVE_MERGER,
    pendingPlayerId: gameState.currentPlayer,
    hotels: gameState.hotels.map((hotel) =>
      hotel.name === survivingHotel.name
        ? survivingHotel
        : mergedHotels.find((h) => h.name === hotel.name) || hotel
    ),
    mergerTieContext: undefined,
    mergerContext: {
      survivingHotel: survivingHotel,
      mergedHotels: mergedHotels,
    },
  };
};

const handleHotelExtension = (gameState: GameState, hotel: Hotel, tile: Tile): Partial<GameState> => ({
  currentPhase: GamePhase.BUY_SHARES,
  hotels: gameState.hotels.map((h) =>
    h.name === hotel.name ? { ...h, tiles: [...h.tiles, tile] } : h
  ),
});

// ... similar handlers for other cases
// Note if we get a gameerror here, we probably ought to bail on the whole turn?
// Error recovery is going to be a motherfucker, it will probably kill the game
export const playTileReducer = (
  gameState: GameState,
  action: PlayTileAction,
): GameState => {
  const { playerId, resolvedTies } = action.payload;
  if (gameState.currentPlayer !== playerId) {
    throw new GameError(
      'Not your turn',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  if (gameState.currentPhase !== GamePhase.PLAY_TILE) {
    throw new GameError(
      'Invalid action',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  const tile = { ...action.payload.tile };
  if (tile.location !== playerId) {
    throw new GameError(
      'Not your tile',
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  // Okay to play, dead tiles were cleaned in previous phase
  tile.location = 'board';
  const updatedTiles = replaceTile(gameState.tiles, tile);
  const gameBoard = board(gameState.tiles);
  const adjacentPositions = getAdjacentPositions(tile.row, tile.col);
  const adjacentHotels = adjacentPositions.map(([r, c]) =>
    findHotel(gameBoard[r][c], gameState.hotels)
  ).filter(Boolean) as Hotel[];

  if (adjacentHotels.length >= 2) {
    // this might just work and we move on to resolve merger, but the player might need to decide which hotel survives in case of tie
    // So does this function return false or undefined or something if it needs the decision?
    const result = mergeHotels(adjacentHotels, tile, resolvedTies);
    if (result.needsMergeOrder) {
      return {
        ...gameState,
        currentPhase: GamePhase.BREAK_MERGER_TIE,
        pendingPlayerId: playerId,
        mergerTieContext: { breakTie: [result.hotel1.name, result.hotel2.name], resolvedTies },
      };
    }
    const { survivingHotel, mergedHotels } = result;
    return {
      ...gameState,
      currentPhase: GamePhase.RESOLVE_MERGER,
      pendingPlayerId: playerId,
      // update tiles
      tiles: updatedTiles,
      // update hotels
      hotels: gameState.hotels.map((hotel) =>
        hotel.name === survivingHotel.name
          ? survivingHotel
          : mergedHotels.find((h) => h.name === hotel.name) || hotel
      ),
      // Clear possible tie breaking context
      mergerTieContext: undefined,
      mergerContext: { survivingHotel: result.survivingHotel, mergedHotels: result.mergedHotels },
    };
  } else if (adjacentHotels.length === 1) {
    // Just add this tile to the existing hotel
    const hotel = adjacentHotels[0]!;
    return {
      ...gameState,
      tiles: updatedTiles,
      hotels: gameState.hotels.map((h) =>
        h.name === hotel.name ? { ...h, tiles: [...h.tiles, tile] } : h
      ),
      currentPhase: GamePhase.BUY_SHARES,
    };
  }
  // No adjacent hotels, check for possible founding hotel
  const adjacentTiles = adjacentPositions.map(([r, c]) => gameBoard[r][c]).filter(
    Boolean,
  );
  if (adjacentTiles.length) {
    // found hotel if there are any available
    const availableHotels = gameState.hotels.filter((hotel) =>
      hotel.shares.some((share) => share.location === 'bank')
    );
    if (availableHotels) {
      return {
        ...gameState,
        tiles: updatedTiles,
        currentPhase: GamePhase.FOUND_HOTEL,
        foundHotelContext: { availableHotels, tiles: [...adjacentTiles, tile] },
      };
    }
  }
  // tile was just placed on the board with no side effects
  return {
    ...gameState,
    currentPhase: GamePhase.BUY_SHARES,
    mergerContext: undefined,
    mergerTieContext: undefined,
    tiles: updatedTiles,
  };
};
