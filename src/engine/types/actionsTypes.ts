import type { GameState } from "./gameState.ts";

export const ActionTypes = {
  START_GAME: "START_GAME",
  ADD_PLAYER: "ADD_PLAYER",
  REMOVE_PLAYER: "REMOVE_PLAYER",
  // other action types...
} as const;

export type ActionType = typeof ActionTypes[keyof typeof ActionTypes];

export interface Action {
  type: ActionType;
  payload: unknown;
}

export type ActionResult = {
  success: boolean;
  newState?: GameState;
  error?: {
    code: string;
    message: string;
  };
};

// Game actions
export interface StartGameAction extends Action {
  type: typeof ActionTypes.START_GAME;
  payload: {
    // Must be owner
    playerName: string;
  };
}

// Player actions
export interface AddPlayerAction extends Action {
  type: typeof ActionTypes.ADD_PLAYER;
  payload: {
    playerName: string;
  };
}
export interface RemovePlayerAction extends Action {
  type: typeof ActionTypes.REMOVE_PLAYER;
  payload: {
    playerId: string;
  };
}

export type GameAction =
  | StartGameAction
  | AddPlayerAction
  | RemovePlayerAction;
