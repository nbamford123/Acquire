import { HOTEL_NAME } from './index.ts';

export const ActionTypes = {
  START_GAME: 'START_GAME',
  ADD_PLAYER: 'ADD_PLAYER',
  REMOVE_PLAYER: 'REMOVE_PLAYER',
  PLAY_TILE: 'PLAY_TILE',
  BUY_SHARES: 'BUY_SHARES',
  BREAK_MERGER_TIE: 'BREAK_MERGER_TIE',
  RESOLVE_MERGER: 'RESOLVE_MERGER',
  FOUND_HOTEL: 'FOUND_HOTEL',
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
    player: string;
  };
}
export interface PlayTileAction extends Action {
  type: typeof ActionTypes.PLAY_TILE;
  payload: {
    player: string;
    tile: { row: number; col: number };
  };
}
export interface BuySharesAction extends Action {
  type: typeof ActionTypes.BUY_SHARES;
  payload: {
    player: string;
    shares: Record<HOTEL_NAME, number>;
  };
}
export interface BreakMergerTieAction extends Action {
  type: typeof ActionTypes.BREAK_MERGER_TIE;
  payload: {
    player: string;
    resolvedTie: { survivor: HOTEL_NAME; merged: HOTEL_NAME };
  };
}
export interface ResolveMergerAction extends Action {
  type: typeof ActionTypes.RESOLVE_MERGER;
  payload: {
    player: string;
    shares?: {
      sell: number;
      trade: number;
    };
  };
}
export interface FoundHotelAction extends Action {
  type: typeof ActionTypes.FOUND_HOTEL;
  payload: {
    player: string;
    hotelName: HOTEL_NAME;
  };
}
// Player actions
export interface AddPlayerAction extends Action {
  type: typeof ActionTypes.ADD_PLAYER;
  payload: {
    player: string;
  };
}
export interface RemovePlayerAction extends Action {
  type: typeof ActionTypes.REMOVE_PLAYER;
  payload: {
    player: string;
  };
}

export type GameAction =
  | StartGameAction
  | AddPlayerAction
  | RemovePlayerAction
  | PlayTileAction
  | BuySharesAction
  | BreakMergerTieAction
  | FoundHotelAction
  | ResolveMergerAction;

// An action as the client sends it. The service adds the player from the login, so no one can act
// for someone else.
type WithoutPlayer<A> = A extends GameAction
  ? { type: A['type']; payload: Omit<A['payload'], 'player'> }
  : never;
export type ClientAction = WithoutPlayer<GameAction>;
export type ClientActionOf<T extends ActionType> = Extract<ClientAction, { type: T }>;

// Builds a client action, checking the payload against the action type
export const createAction = <T extends ActionType>(
  type: T,
  payload: ClientActionOf<T>['payload'],
) => ({ type, payload }) as ClientActionOf<T>;
