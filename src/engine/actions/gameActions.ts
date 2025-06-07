import {
  ActionTypes,
  type BreakMergerTieAction,
  type BuySharesAction,
  type FoundHotelAction,
  type PlayTileAction,
  type ResolveMergerAction,
  type StartGameAction,
} from '@/engine/types/actionsTypes.ts';
import type { HOTEL_NAME, Tile } from '@/engine/types/index.ts';

export const startGame = (playerName: string): StartGameAction => {
  return {
    type: ActionTypes.START_GAME,
    payload: { playerName },
  };
};

export const playTile = (playerId: number, tile: Tile): PlayTileAction => {
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
  tieBreaker: [HOTEL_NAME, HOTEL_NAME],
): BreakMergerTieAction => {
  return {
    type: ActionTypes.BREAK_MERGER_TIE,
    payload: { playerId, hotels: tieBreaker },
  };
};

export const resolveMerger = (
  playerId: number,
  tieBreaker?: [hotel1: HOTEL_NAME, hotel2: HOTEL_NAME],
  shares?: { sell: number; trade: number },
): ResolveMergerAction => {
  return {
    type: ActionTypes.RESOLVE_MERGER,
    payload: { playerId, shares },
  };
};
