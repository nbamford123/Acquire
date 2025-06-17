import {
  ActionTypes,
  type BreakMergerTieAction,
  type BuySharesAction,
  type FoundHotelAction,
  type PlayTileAction,
  type ResolveMergerAction,
  type StartGameAction,
} from '@/engine/types/actionsTypes.ts';
import type { HOTEL_NAME } from '@/engine/types/index.ts';

export const startGame = (playerName: string): StartGameAction => {
  return {
    type: ActionTypes.START_GAME,
    payload: { playerName },
  };
};

export const playTile = (playerId: number, tile: { row: number; col: number }): PlayTileAction => {
  return {
    type: ActionTypes.PLAY_TILE,
    payload: { playerId, tile },
  };
};

export const buyShares = (
  playerId: number,
  shares: Record<HOTEL_NAME, number>,
): BuySharesAction => {
  return {
    type: ActionTypes.BUY_SHARES,
    payload: { playerId, shares },
  };
};

export const foundHotel = (
  playerId: number,
  hotelName: HOTEL_NAME,
): FoundHotelAction => {
  return {
    type: ActionTypes.FOUND_HOTEL,
    payload: { playerId, hotelName },
  };
};

export const breakMergerTie = (
  playerId: number,
  resolvedTie: { survivor: HOTEL_NAME; merged: HOTEL_NAME },
): BreakMergerTieAction => {
  return {
    type: ActionTypes.BREAK_MERGER_TIE,
    payload: { playerId, resolvedTie },
  };
};

export const resolveMerger = (
  playerId: number,
  shares?: { sell: number; trade: number },
): ResolveMergerAction => {
  return {
    type: ActionTypes.RESOLVE_MERGER,
    payload: { playerId, shares },
  };
};
