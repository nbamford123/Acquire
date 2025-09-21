import {
  type ActionType,
  ActionTypes,
  type AddPlayerAction,
  type BreakMergerTieAction,
  type BuySharesAction,
  type FoundHotelAction,
  type GameAction,
  type GameState,
  type PlayTileAction,
  type RemovePlayerAction,
  type ResolveMergerAction,
  type StartGameAction,
} from '../types/index.ts';
import {
  addPlayerReducer,
  breakMergerTieReducer,
  buySharesReducer,
  foundHotelReducer,
  playTileReducer,
  removePlayerReducer,
  resolveMergerReducer,
  startGameReducer,
} from '../reducers/index.ts';

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
  [ActionTypes.PLAY_TILE]: createActionHandler<PlayTileAction>(playTileReducer),
  [ActionTypes.BUY_SHARES]: createActionHandler<BuySharesAction>(buySharesReducer),
  [ActionTypes.FOUND_HOTEL]: createActionHandler<FoundHotelAction>(foundHotelReducer),
  [ActionTypes.RESOLVE_MERGER]: createActionHandler<ResolveMergerAction>(resolveMergerReducer),
  [ActionTypes.BREAK_MERGER_TIE]: createActionHandler<BreakMergerTieAction>(breakMergerTieReducer),
};
