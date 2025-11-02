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
  addPlayerUseCase,
  breakMergerTieUseCase,
  buySharesUseCase,
  foundHotelUseCase,
  playTileUseCase,
  removePlayerUseCase,
  resolveMergerUseCase,
  startGameUseCase,
} from '../usecases/index.ts';

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
  [ActionTypes.ADD_PLAYER]: createActionHandler<AddPlayerAction>(addPlayerUseCase),
  [ActionTypes.REMOVE_PLAYER]: createActionHandler<RemovePlayerAction>(removePlayerUseCase),
  [ActionTypes.START_GAME]: createActionHandler<StartGameAction>(startGameUseCase),
  [ActionTypes.PLAY_TILE]: createActionHandler<PlayTileAction>(playTileUseCase),
  [ActionTypes.BUY_SHARES]: createActionHandler<BuySharesAction>(buySharesUseCase),
  [ActionTypes.FOUND_HOTEL]: createActionHandler<FoundHotelAction>(foundHotelUseCase),
  [ActionTypes.RESOLVE_MERGER]: createActionHandler<ResolveMergerAction>(resolveMergerUseCase),
  [ActionTypes.BREAK_MERGER_TIE]: createActionHandler<BreakMergerTieAction>(
    breakMergerTieUseCase,
  ),
};
