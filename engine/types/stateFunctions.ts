import type { Action, GameState, PlayerAction } from './index.ts';

export type OrchestratorFunction = (
  state: GameState,
) => readonly [GameState, PlayerAction[]];

export type OrchestratorActionFunction<T extends Action> = (
  state: GameState,
  action: T,
) => readonly [GameState, PlayerAction[]];

export type UseCaseFunction<T extends Action> = (
  state: GameState,
  action: T,
) => readonly [GameState, PlayerAction[]];
