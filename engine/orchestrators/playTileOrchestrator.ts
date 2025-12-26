import {
  analyzeTilePlacement,
  boardTiles,
  getAvailableHotelNames,
  updateTiles,
} from '../domain/index.ts';
import { growHotelReducer } from '../reducers/index.ts';
import { processMergerOrchestrator } from './processMergerOrchestrator.ts';
import { proceedToBuySharesOrchestrator } from './proceedToBuySharesOrchestrator.ts';
import { getTileLabel } from '../utils/getTileLabel.ts';
import {
  type BoardTile,
  GamePhase,
  type OrchestratorActionFunction,
  type PlayTileAction,
} from '../types/index.ts';

export const playTileOrchestrator: OrchestratorActionFunction<PlayTileAction> = (
  gameState,
  playTileAction,
) => {
  // Put the tile on the board
  const playedTile = playTileAction.payload.tile;
  const tile: BoardTile = { ...playedTile, location: 'board' };
  const updatedGameState = {
    ...gameState,
    tiles: updateTiles(gameState.tiles, [tile]),
  };
  const action = {
    turn: gameState.currentTurn,
    action: `${gameState.players[gameState.currentPlayer].name} played ${getTileLabel(tile)}`,
  };
  const placement = analyzeTilePlacement(tile, gameState.tiles);
  if (placement.triggersMerger) {
    const [mergerState, mergerActions] = processMergerOrchestrator({
      ...updatedGameState,
      mergeContext: {
        originalHotels: placement.adjacentHotels,
        additionalTiles: [tile, ...placement.additionalTiles],
      },
    });
    return [mergerState, [action, ...mergerActions]];
  } else if (placement.foundsHotel) {
    return [{
      ...updatedGameState,
      currentPhase: GamePhase.FOUND_HOTEL,
      foundHotelContext: {
        availableHotels: getAvailableHotelNames(boardTiles(gameState.tiles)),
        tiles: [tile, ...placement.adjacentTiles],
      },
    }, [action]];
  } else if (placement.growsHotel) {
    const [buySharesState, buySharesActions] = proceedToBuySharesOrchestrator({
      ...growHotelReducer(
        updatedGameState,
        placement.adjacentHotels[0],
        tile,
        placement.additionalTiles,
      ),
    });
    return [
      buySharesState,
      [action, ...buySharesActions],
    ];
  }
  // else, simple placement
  const [buySharesState, buySharesActions] = proceedToBuySharesOrchestrator(updatedGameState);
  return [buySharesState, [action, ...buySharesActions]];
};
