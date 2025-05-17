import type { GameState, GameAction, ActionResult } from '@/engine/types/index.ts';
import { actionHandlers } from './actionHandlers.ts';

export const rootReducer = (state: GameState, action: GameAction): GameState => {
  // Get the appropriate handler for this action type
  const handler = actionHandlers[action.type];
  
  // If we have a handler, use it; otherwise return the state unchanged
  if (!handler) {
    console.warn(`No handler registered for action type: ${action.type}`);
    return state;
  }
  
  const result: ActionResult = handler(state, action);
  
  // Return the new state if successful, otherwise return the original state
  return result.success && result.newState ? result.newState : state;
}
