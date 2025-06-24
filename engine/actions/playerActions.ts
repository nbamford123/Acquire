import { ActionTypes, type AddPlayerAction } from '@/types/actionsTypes.ts';

export const addPlayer = (playerName: string): AddPlayerAction => {
  return {
    type: ActionTypes.ADD_PLAYER,
    payload: { playerName },
  };
};
