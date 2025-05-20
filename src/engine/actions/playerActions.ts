import { ActionTypes, type AddPlayerAction } from "@/engine/types/actionsTypes.ts";

export const addPlayer = (playerName: string): AddPlayerAction => {
  return {
    type: ActionTypes.ADD_PLAYER,
    payload: { playerName }
  };
}
