import { ActionTypes, type AddPlayerAction } from '../types/actionsTypes.ts';

export const addPlayer = (player: string): AddPlayerAction => {
  return {
    type: ActionTypes.ADD_PLAYER,
    payload: { player },
  };
};
