import { getFoundHotelContext } from '../domain/index.ts';
import { foundHotelReducer } from '../reducers/foundHotelReducer.ts';
import { proceedToBuySharesOrchestrator } from './proceedToBuySharesOrchestrator.ts';
import type { FoundHotelAction, OrchestratorActionFunction } from '../types/index.ts';

export const foundHotelOrchestrator: OrchestratorActionFunction<FoundHotelAction> = (
  gameState,
  foundHotelAction,
) => {
  const foundHotelContext = getFoundHotelContext(gameState);
  const hotel = foundHotelAction.payload.hotelName;
  const updatedState = {
    ...gameState,
    ...foundHotelReducer(
      gameState.currentPlayer,
      gameState.hotels,
      hotel,
      foundHotelContext,
      gameState.tiles,
    ),
  };
  const action = {
    turn: gameState.currentTurn,
    action: `${
      gameState.players[gameState.currentPlayer].name
    } founds ${hotel} and receives one share`,
  };
  const [proceedState, actions] = proceedToBuySharesOrchestrator(updatedState);
  return [proceedState, [action, ...actions]];
};
