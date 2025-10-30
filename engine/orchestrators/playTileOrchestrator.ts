import { type BoardTile, GamePhase, type GameState } from '../types/index.ts';
import {
  analyzeTilePlacement,
  boardTiles,
  getAvailableHotelNames,
  updateTiles,
} from '../domain/index.ts';
import { growHotelReducer } from '../reducers/index.ts';
import { processMergerOrchestrator } from './processMergerOrchestrator.ts';
import { buySharesOrchestrator } from './buySharesOrchestrator.ts';

export const playTileOrchestrator = (
  gameState: GameState,
  playedTile: { row: number; col: number },
): GameState => {
  // Put the tile on the board
  const tile: BoardTile = { ...playedTile, location: 'board' };
  const placement = analyzeTilePlacement(tile, gameState.tiles);
  const updatedGameState = {
    ...gameState,
    tiles: updateTiles([tile], gameState.tiles),
  };

  // Will played tile get a hotel here as part of the merger logic?
  if (placement.triggersMerger) {
    return processMergerOrchestrator(updatedGameState, {
      originalHotels: placement.adjacentHotels,
      additionalTiles: [tile, ...placement.additionalTiles],
    });
  } else if (placement.foundsHotel) {
    return {
      ...updatedGameState,
      currentPhase: GamePhase.FOUND_HOTEL,
      foundHotelContext: {
        availableHotels: getAvailableHotelNames(boardTiles(gameState.tiles)),
        tiles: [tile, ...placement.adjacentTiles],
      },
    };
  } else if (placement.growsHotel) {
    return buySharesOrchestrator({
      ...growHotelReducer(
        updatedGameState,
        placement.adjacentHotels[0],
        tile,
        placement.additionalTiles,
      ),
    });
  }
  // else, simple placement
  return buySharesOrchestrator(updatedGameState);
};
