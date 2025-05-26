import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type Hotel,
} from '@/engine/types/index.ts';
import type { PlayTileAction, Tile } from '@/engine/types/index.ts';
import { board, findHotel, mergeHotels, replaceTile } from '@/engine/domain/index.ts';
import { filterDefined, getAdjacentPositions } from '@/engine/utils/index.ts';

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

  const adjacentHotels = filterDefined(adjacentPositions
    .map(([r, c]) => findHotel(gameBoard[r][c], hotels)));

  if (adjacentHotels.length >= 2) {
    return { type: 'MERGER' as const, adjacentHotels };
  }
  if (adjacentHotels.length === 1) {
    return { type: 'EXTEND_HOTEL' as const, hotel: adjacentHotels[0] };
  }

  const adjacentTiles = filterDefined(adjacentPositions
    .map(([r, c]) => gameBoard[r][c]));
  if (adjacentTiles.length > 0) {
    const availableHotels = hotels.filter((hotel) =>
      hotel.shares.some((share) => share.location === 'bank')
    );
    if (availableHotels) {
      return { type: 'FOUND_HOTEL' as const, adjacentTiles, availableHotels };
    }
  }

  return { type: 'SIMPLE_PLACEMENT' as const };
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

const handleHotelExtension = (
  gameState: GameState,
  hotel: Hotel,
  tile: Tile,
): Partial<GameState> => ({
  currentPhase: GamePhase.BUY_SHARES,
  hotels: gameState.hotels.map((h) =>
    h.name === hotel.name ? { ...h, tiles: [...h.tiles, tile] } : h
  ),
});

const handleHotelFounding = (
  adjacentTiles: Tile[],
  availableHotels: Hotel[],
  tile: Tile,
): Partial<GameState> => {
  return {
    currentPhase: GamePhase.FOUND_HOTEL,
    foundHotelContext: { availableHotels, tiles: [...adjacentTiles, tile] },
  };
};

const handleSimplePlacement = (): Partial<GameState> => {
  return {
    currentPhase: GamePhase.BUY_SHARES,
  };
};

// Note if we get a gameerror here, we probably ought to bail on the whole turn?
// Error recovery is going to be a motherfucker, it will probably kill the game
export const playTileReducer = (
  gameState: GameState,
  action: PlayTileAction,
): GameState => {
  validatePlayTileAction(gameState, action);

  const tile = { ...action.payload.tile, location: 'board' as const };
  // I don't think we need the new tile added to the board at this point
  const gameBoard = board(gameState.tiles);

  const outcome = determinePlayTileOutcome(
    tile,
    gameBoard,
    gameState.hotels,
  );

  let businessLogicChanges: Partial<GameState>;

  switch (outcome.type) {
    case 'MERGER':
      businessLogicChanges = handleMerger(
        gameState,
        outcome.adjacentHotels,
        tile,
        action.payload.resolvedTies || [],
      );
      break;
    case 'EXTEND_HOTEL':
      businessLogicChanges = handleHotelExtension(gameState, outcome.hotel, tile);
      break;
    case 'FOUND_HOTEL':
      businessLogicChanges = handleHotelFounding(
        outcome.adjacentTiles,
        outcome.availableHotels,
        tile,
      );
      break;
    case 'SIMPLE_PLACEMENT':
    default:
      businessLogicChanges = handleSimplePlacement();
      break;
  }

  return {
    ...gameState,
    ...businessLogicChanges,
    mergerContext: undefined,
    mergerTieContext: undefined,
    tiles: replaceTile(gameState.tiles, tile),
  };
};
