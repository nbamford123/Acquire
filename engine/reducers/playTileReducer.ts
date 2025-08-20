import {
  type BoardTile,
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type Hotel,
  type HOTEL_NAME,
  type PlayTileAction,
  type Tile,
} from '../../shared/types/index.ts';
import { boardTiles, getTile, updateTiles } from '../domain/index.ts';
import { handleMerger } from '../state/gameStateUpdater.ts';
import { getAdjacentPositions } from '../../shared/utils/index.ts';

const validatePlayTileAction = (gameState: GameState, action: PlayTileAction): BoardTile => {
  const { player, tile } = action.payload;
  const playerId = gameState.players.findIndex((p) => p.name === player);

  if (gameState.currentPlayer !== playerId) {
    throw new GameError('Not your turn', GameErrorCodes.GAME_INVALID_ACTION);
  }
  if (gameState.currentPhase !== GamePhase.PLAY_TILE) {
    throw new GameError('Invalid action', GameErrorCodes.GAME_INVALID_ACTION);
  }
  const gameTile = getTile(gameState.tiles, tile.row, tile.col);
  if (!gameTile || gameTile.location !== playerId) {
    throw new GameError('Invalid or not player tile', GameErrorCodes.GAME_INVALID_ACTION);
  }
  return { ...gameTile, location: 'board' };
};

const determinePlayTileOutcome = (
  tile: BoardTile,
  tiles: Tile[],
  hotels: Hotel[],
) => {
  const adjacentPositions = getAdjacentPositions(tile.row, tile.col);
  const adjacentTiles = adjacentPositions
    .map(([r, c]) => getTile(tiles, r, c)).filter(
      (tile): tile is Tile & { location: 'board'; hotel?: HOTEL_NAME } =>
        tile ? tile.location === 'board' : false,
    );
  const adjacentHotels = adjacentTiles
    .flatMap((tile) => tile.hotel ? [tile.hotel] : []);
  if (adjacentHotels.length) {
    // Find any tiles that don't belong to a hotel-- they will be added to the existing hotel (possibly after a merger)
    const additionalTiles = adjacentTiles.filter((tile) => !tile.hotel);
    if (adjacentHotels.length >= 2) {
      return {
        type: 'MERGE_HOTELS' as const,
        adjacentHotels,
        additionalTiles,
      };
    }
    if (adjacentHotels.length === 1) {
      return {
        type: 'EXTEND_HOTEL' as const,
        hotel: adjacentHotels[0]!,
        additionalTiles,
      };
    }
  }
  // Adjacent tiles without a hotel makes this a potential new hotel
  if (adjacentTiles.length > 0) {
    const availableHotels = hotels.filter((hotel) =>
      hotel.shares.some((share) => share.location === 'bank')
    ).map((hotel) => hotel.name);
    if (availableHotels.length) {
      return { type: 'FOUND_HOTEL' as const, availableHotels, adjacentTiles };
    }
  }

  return { type: 'SIMPLE_PLACEMENT' as const };
};

const handleHotelExtension = (
  gameState: GameState,
  tiles: BoardTile[],
  hotel: HOTEL_NAME,
): Partial<GameState> => ({
  currentPhase: GamePhase.BUY_SHARES,
  tiles: updateTiles(gameState.tiles, tiles.map((tile) => ({ ...tile, hotel }))),
});

const handleHotelFounding = (
  availableHotels: HOTEL_NAME[],
  contextTiles: Tile[],
): Partial<GameState> => {
  return {
    currentPhase: GamePhase.FOUND_HOTEL,
    foundHotelContext: { availableHotels, tiles: contextTiles },
  };
};

const handleSimplePlacement = (tiles: Tile[], tile: BoardTile): Partial<GameState> => {
  return {
    currentPhase: GamePhase.BUY_SHARES,
    tiles: updateTiles(tiles, [tile]),
  };
};

// Note if we get a gameerror here, we probably ought to bail on the whole turn?
// Error recovery is going to be a motherfucker, it will probably kill the game
export const playTileReducer = (
  gameState: GameState,
  action: PlayTileAction,
): GameState => {
  // validate action and return new tile added to board
  const tile = validatePlayTileAction(gameState, action);

  const outcome = determinePlayTileOutcome(
    tile,
    gameState.tiles,
    gameState.hotels,
  );
  let businessLogicChanges: Partial<GameState>;
  const gameBoard = boardTiles(gameState.tiles);

  switch (outcome.type) {
    case 'MERGE_HOTELS': {
      businessLogicChanges = handleMerger(
        gameState.players,
        gameBoard,
        gameState.hotels,
        {
          originalHotels: outcome.adjacentHotels,
          additionalTiles: [
            tile,
            ...outcome.additionalTiles,
          ],
        },
      );
      break;
    }
    case 'EXTEND_HOTEL':
      businessLogicChanges = handleHotelExtension(
        gameState,
        [tile, ...outcome.additionalTiles],
        outcome.hotel,
      );
      break;
    case 'FOUND_HOTEL':
      businessLogicChanges = handleHotelFounding(
        outcome.availableHotels,
        [tile, ...outcome.adjacentTiles],
      );
      break;
    case 'SIMPLE_PLACEMENT':
    default:
      businessLogicChanges = handleSimplePlacement(gameState.tiles, tile);
      break;
  }

  return {
    ...gameState,
    ...businessLogicChanges,
  };
};
