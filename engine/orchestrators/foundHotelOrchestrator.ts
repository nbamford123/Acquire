import { getFoundHotelContext } from '../domain/index.ts';
import { foundHotelReducer } from '../reducers/foundHotelReducer.ts';
import { proceedToBuySharesOrchestrator } from './proceedToBuySharesOrchestrator.ts';
import type { GameState, HOTEL_NAME } from '../types/index.ts';

export const foundHotelOrchestrator = (
  gameState: GameState,
  hotelName: HOTEL_NAME,
): GameState => {
  const foundHotelContext = getFoundHotelContext(gameState);
  const updatedState = {
    ...gameState,
    ...foundHotelReducer(
      gameState.currentPlayer,
      gameState.hotels,
      hotelName,
      foundHotelContext,
      gameState.tiles,
    ),
  };
  return proceedToBuySharesOrchestrator(updatedState);
};
