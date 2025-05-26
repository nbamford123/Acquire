import {
  ActionTypes,
  type BuySharesAction,
  type PlayerTurnAction,
  type PlayTileAction,
  type StartGameAction,
} from '@/engine/types/actionsTypes.ts';
import type { HOTEL_NAME, Tile } from '@/engine/types/index.ts';

export const startGame = (playerName: string): StartGameAction => {
  return {
    type: ActionTypes.START_GAME,
    payload: { playerName },
  };
};

export const playerTurn = (playerId: number): PlayerTurnAction => {
  return {
    type: ActionTypes.PLAYER_TURN,
    payload: { playerId },
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
