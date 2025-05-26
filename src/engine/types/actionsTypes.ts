import { HOTEL_NAME, Tile } from '@/engine/types/index.ts';

export const ActionTypes = {
  START_GAME: 'START_GAME',
  ADD_PLAYER: 'ADD_PLAYER',
  REMOVE_PLAYER: 'REMOVE_PLAYER',
  PLAYER_TURN: 'PLAYER_TURN',
  PLAY_TILE: 'PLAY_TILE',
  BUY_SHARES: 'BUY_SHARES',
  // TODO(me): need an action for dumping all your tiles and redrawing. Do you get to buy shares?
} as const;

export type ActionType = typeof ActionTypes[keyof typeof ActionTypes];

export interface Action {
  type: ActionType;
  payload: unknown;
}

// Game actions
export interface StartGameAction extends Action {
  type: typeof ActionTypes.START_GAME;
  payload: {
    // Must be owner
    playerName: string;
  };
}
export interface PlayerTurnAction extends Action {
  type: typeof ActionTypes.PLAYER_TURN;
  payload: {
    playerId: number;
  };
}
export interface PlayTileAction extends Action {
  type: typeof ActionTypes.PLAY_TILE;
  payload: {
    playerId: number;
    tile: Tile;
    resolvedTies?: [string, string][];
  };
}
export interface BuySharesAction extends Action {
  type: typeof ActionTypes.BUY_SHARES;
  payload: {
    playerId: number;
    shares: Record<HOTEL_NAME, number>;
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
    playerName: string;
  };
}

export type GameAction =
  | StartGameAction
  | AddPlayerAction
  | RemovePlayerAction
  | PlayerTurnAction
  | PlayTileAction
  | BuySharesAction;
