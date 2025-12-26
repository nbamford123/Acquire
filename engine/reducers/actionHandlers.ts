import {
  type ActionType,
  ActionTypes,
  type AddPlayerAction,
  type BreakMergerTieAction,
  type BuySharesAction,
  type FoundHotelAction,
  type GameAction,
  type GameState,
  type PlayerAction,
  type PlayTileAction,
  type RemovePlayerAction,
  type ResolveMergerAction,
  type StartGameAction,
  type UseCaseFunction,
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
  handler: UseCaseFunction<T>,
): (state: GameState, action: GameAction) => readonly [GameState, PlayerAction[]] {
  return (state: GameState, action: GameAction): readonly [GameState, PlayerAction[]] => {
    return handler(state, action as T);
  };
}

// Action handler registry
export const actionHandlers: Record<
  ActionType,
  UseCaseFunction<GameAction>
> = {
  [ActionTypes.ADD_PLAYER]: createActionHandler<AddPlayerAction>(addPlayerUseCase),
  [ActionTypes.REMOVE_PLAYER]: createActionHandler<RemovePlayerAction>(removePlayerUseCase),
  [ActionTypes.START_GAME]: createActionHandler<StartGameAction>(startGameUseCase),
  [ActionTypes.PLAY_TILE]: createActionHandler<PlayTileAction>(playTileUseCase),
  [ActionTypes.BUY_SHARES]: createActionHandler<BuySharesAction>(buySharesUseCase),
  [ActionTypes.FOUND_HOTEL]: createActionHandler<FoundHotelAction>(foundHotelUseCase),
  [ActionTypes.RESOLVE_MERGER]: createActionHandler<ResolveMergerAction>(resolveMergerUseCase),
  [ActionTypes.BREAK_MERGER_TIE]: createActionHandler<BreakMergerTieAction>(breakMergerTieUseCase),
};
