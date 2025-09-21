import {
  ActionTypes,
  type BreakMergerTieAction,
  type BuySharesAction,
  type FoundHotelAction,
  type HOTEL_NAME,
  type PlayTileAction,
  type ResolveMergerAction,
  type StartGameAction,
} from '../types/index.ts';

export const startGame = (player: string): StartGameAction => {
  return {
    type: ActionTypes.START_GAME,
    payload: { player },
  };
};

export const playTile = (
  player: string,
  tile: { row: number; col: number },
): PlayTileAction => {
  return {
    type: ActionTypes.PLAY_TILE,
    payload: { player, tile },
  };
};

export const buyShares = (
  player: string,
  shares: Record<HOTEL_NAME, number>,
): BuySharesAction => {
  return {
    type: ActionTypes.BUY_SHARES,
    payload: { player, shares },
  };
};

export const foundHotel = (
  player: string,
  hotelName: HOTEL_NAME,
): FoundHotelAction => {
  return {
    type: ActionTypes.FOUND_HOTEL,
    payload: { player, hotelName },
  };
};

export const breakMergerTie = (
  player: string,
  resolvedTie: { survivor: HOTEL_NAME; merged: HOTEL_NAME },
): BreakMergerTieAction => {
  return {
    type: ActionTypes.BREAK_MERGER_TIE,
    payload: { player, resolvedTie },
  };
};

export const resolveMerger = (
  player: string,
  shares?: { sell: number; trade: number },
): ResolveMergerAction => {
  return {
    type: ActionTypes.RESOLVE_MERGER,
    payload: { player, shares },
  };
};
