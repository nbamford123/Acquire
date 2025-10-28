import {
  type BoardTile,
  GamePhase,
  type GameState,
  type Hotel,
  type Player,
  type Tile,
} from '../types/index.ts';
import { getAvailableHotels, updateTiles } from '../domain/index.ts';
import { processMerger } from './mergerOrchestrator.ts';
import { analyzeTilePlacement } from '../domain/index.ts';
import { boardTiles } from '../domain/tileOperations.ts';

export const playTileOrchestrator = (
  playedTile: { row: number; col: number },
  tiles: Tile[],
  players: Player[],
  hotels: Hotel[],
): Partial<GameState> => {
  // Put the tile on the board
  const tile: BoardTile = { ...playedTile, location: 'board' };
  const placement = analyzeTilePlacement(tile, tiles);
  const updatedTiles = updateTiles([tile], tiles);
  // Will played tile get a hotel here as part of the merger logic?
  if (placement.triggersMerger) {
    return {
      tiles: updatedTiles,
      ...processMerger(
        updatedTiles,
        {
          originalHotels: placement.adjacentHotels,
          additionalTiles: [tile, ...placement.additionalTiles],
        },
        players,
        hotels,
      ),
    };
  } else if (placement.foundsHotel) {
    return {
      tiles: updatedTiles,
      currentPhase: GamePhase.FOUND_HOTEL,
      foundHotelContext: {
        availableHotels: getAvailableHotels(boardTiles(tiles)),
        tiles: [tile, ...placement.adjacentTiles],
      },
    };
  } else if (placement.growsHotel) {
    return {
      tiles: updateTiles(updatedTiles, [
        { ...tile, hotel: placement.adjacentHotels[0] },
        ...placement.additionalTiles.map((tile) => ({
          ...tile,
          hotel: placement.adjacentHotels[0],
        })),
      ]),
      // TODO(me): domain function for canBuyShares, domain function to advance turn? or use case?
      currentPhase: GamePhase.BUY_SHARES,
    };
  }
  // else, simple placement
  return {
    tiles: [...updatedTiles],
    // TODO(me): domain function for canBuyShares, domain function to advance turn? or use case?
    currentPhase: GamePhase.BUY_SHARES,
  };
};
