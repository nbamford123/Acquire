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
  // TODO(me): need an action for dumping all your tiles and redrawing. Do you get to buy shares?
} as const;

export type ActionType = typeof ActionTypes[keyof typeof ActionTypes];

interface Action {
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
    shares: Partial<Record<HOTEL_NAME, number>>;
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
