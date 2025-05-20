import {
  ActionTypes,
  type StartGameAction,
} from "@/engine/types/actionsTypes.ts";

export const startGame = (playerName: string): StartGameAction => {
  return {
    type: ActionTypes.START_GAME,
    payload: { playerName },
  };
};
