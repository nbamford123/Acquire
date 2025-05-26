import {
  type ActionType,
  ActionTypes,
  type AddPlayerAction,
  type BuySharesAction,
  type GameAction,
  type GameState,
  type PlayerTurnAction,
  type PlayTileAction,
  type RemovePlayerAction,
  type StartGameAction,
} from '@/engine/types/index.ts';
import { addPlayerReducer, removePlayerReducer } from './playerReducers.ts';
import {
  buySharesReducer,
  playerTurnReducer,
  playTileReducer,
  startGameReducer,
} from '@/engine/reducers/index.ts';
// Import other reducers

// Type-safe action handler wrapper
function createActionHandler<T extends GameAction>(
  handler: (state: GameState, action: T) => GameState,
): (state: GameState, action: GameAction) => GameState {
  return (state: GameState, action: GameAction): GameState => {
    return handler(state, action as T);
  };
}

// Action handler registry
export const actionHandlers: Record<
  ActionType,
  (state: GameState, action: GameAction) => GameState
> = {
  [ActionTypes.ADD_PLAYER]: createActionHandler<AddPlayerAction>(addPlayerReducer),
  [ActionTypes.REMOVE_PLAYER]: createActionHandler<RemovePlayerAction>(removePlayerReducer),
  [ActionTypes.START_GAME]: createActionHandler<StartGameAction>(startGameReducer),
  [ActionTypes.PLAYER_TURN]: createActionHandler<PlayerTurnAction>(playerTurnReducer),
  [ActionTypes.PLAY_TILE]: createActionHandler<PlayTileAction>(playTileReducer),
  [ActionTypes.BUY_SHARES]: createActionHandler<BuySharesAction>(buySharesReducer),
  // Register other action handlers
};
