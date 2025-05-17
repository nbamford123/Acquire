// actionHandlers.ts
import {
  type ActionResult,
  type ActionType,
  ActionTypes,
  type GameAction,
  type GameState,
  type AddPlayerAction,
  type RemovePlayerAction,
} from "@/engine/types/index.ts";
import { addPlayerReducer, removePlayerReducer } from "./playerReducers.ts";
// Import other reducers

// Type-safe action handler wrapper
function createActionHandler<T extends GameAction>(
  handler: (state: GameState, action: T) => ActionResult
): (state: GameState, action: GameAction) => ActionResult {
  return (state: GameState, action: GameAction): ActionResult => {
    return handler(state, action as T);
  };
}

// Action handler registry
export const actionHandlers: Record<
  ActionType,
  (state: GameState, action: GameAction) => ActionResult
> = {
  [ActionTypes.ADD_PLAYER]: createActionHandler<AddPlayerAction>(addPlayerReducer),
  [ActionTypes.REMOVE_PLAYER]: createActionHandler<RemovePlayerAction>(removePlayerReducer),
  // Register other action handlers
};
