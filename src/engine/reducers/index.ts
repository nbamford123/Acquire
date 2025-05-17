// reducers/index.ts
import { GameState, Action } from '../types';
import * as ActionTypes from '../actionTypes';
import { playTileReducer } from './playTile';
import { endTurnReducer } from './endTurn';
// Import other reducers

// Action handler registry
const actionHandlers: Record<string, (state: GameState, action: Action) => GameState> = {
  [ActionTypes.PLAY_TILE]: playTileReducer,
  [ActionTypes.END_TURN]: endTurnReducer,
  // Register other action handlers
};