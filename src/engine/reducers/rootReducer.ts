import {
  type GameAction,
  GameError,
  GameErrorCodes,
  type GameState,
} from '@/engine/types/index.ts';
import { actionHandlers } from './actionHandlers.ts';

export const rootReducer = (
  state: GameState,
  action: GameAction,
): GameState => {
  try {
    // Get the appropriate handler for this action type
    const handler = actionHandlers[action.type];

    // If we have a handler, use it; otherwise return the state unchanged
    if (!handler) {
      console.warn(`No handler registered for action type: ${action.type}`);
      return state;
    }

    const newState = handler(state, action);
    return {
      ...newState,
      error: null, // Auto-clear error on success
    }; 
  } catch (error) {
    return {
      ...state,
      error: error instanceof GameError
        ? {
          code: error.code,
          message: error.message,
        }
        : {
          code: GameErrorCodes.UNKNOWN_ERROR,
          message: error instanceof Error ? error.message : String(error),
        },
    };
  }
};
