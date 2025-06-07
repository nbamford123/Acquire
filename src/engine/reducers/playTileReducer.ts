import {
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type Hotel,
} from '@/engine/types/index.ts';
import type { PlayTileAction, Tile } from '@/engine/types/index.ts';
import { board, findHotel, replaceTile } from '@/engine/domain/index.ts';
import { handleMerger } from '@/engine/state/gameStateUpdater.ts';
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
  gameBoard: Array<Array<Tile | undefined>>,
  hotels: Hotel[],
) => {
  const adjacentPositions = getAdjacentPositions(tile.row, tile.col);

  const adjacentTiles = filterDefined(adjacentPositions
    .map(([r, c]) => gameBoard[r][c]));

  const adjacentHotels = filterDefined(
    adjacentTiles
      .map(({ row, col }) => findHotel(gameBoard[row][col], hotels)),
  );

  if (adjacentHotels.length) {
    const additionalTiles = adjacentTiles.filter((tile) => !findHotel(tile, hotels));
    if (adjacentHotels.length >= 2) {
      return { type: 'MERGE_HOTELS' as const, adjacentHotels, additionalTiles };
    }
    if (adjacentHotels.length === 1) {
      return { type: 'EXTEND_HOTEL' as const, hotel: adjacentHotels[0], additionalTiles };
    }
  }

  if (adjacentTiles.length > 0) {
    const availableHotels = hotels.filter((hotel) =>
      hotel.shares.some((share) => share.location === 'bank')
    );
    if (availableHotels.length) {
      return { type: 'FOUND_HOTEL' as const, availableHotels, adjacentTiles };
    }
  }

  return { type: 'SIMPLE_PLACEMENT' as const };
};

const handleHotelExtension = (
  gameState: GameState,
  tiles: Tile[],
  hotel: Hotel,
): Partial<GameState> => ({
  currentPhase: GamePhase.BUY_SHARES,
  hotels: gameState.hotels.map((h) =>
    h.name === hotel.name ? { ...h, tiles: [...h.tiles, ...tiles] } : h
  ),
});

const handleHotelFounding = (
  playedTile: Tile,
  availableHotels: Hotel[],
  contextTiles: Tile[],
): Partial<GameState> => {
  return {
    currentPhase: GamePhase.FOUND_HOTEL,
    foundHotelContext: { availableHotels, playedTile, tiles: contextTiles },
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
  // I don't think we need the new tile added to the board array at this point
  const gameBoard = board(gameState.tiles);

  const outcome = determinePlayTileOutcome(
    tile,
    gameBoard,
    gameState.hotels,
  );

  let businessLogicChanges: Partial<GameState>;

  switch (outcome.type) {
    case 'MERGE_HOTELS':
      businessLogicChanges = handleMerger(gameState, outcome.adjacentHotels, [
        tile,
        ...outcome.additionalTiles,
      ]);
      break;
    case 'EXTEND_HOTEL':
      businessLogicChanges = handleHotelExtension(
        gameState,
        [tile, ...outcome.additionalTiles],
        outcome.hotel,
      );
      break;
    case 'FOUND_HOTEL':
      businessLogicChanges = handleHotelFounding(
        tile,
        outcome.availableHotels,
        [tile, ...outcome.adjacentTiles], // Include played tile and adjacent tiles
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
    tiles: replaceTile(gameState.tiles, tile),
  };
};
