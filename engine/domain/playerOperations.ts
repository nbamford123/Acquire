import { INITIAL_PLAYER_MONEY, type Player } from '../types/index.ts';

export const initializePlayer = (playerName: string): Player => ({
  id: -1,
  name: playerName,
  money: INITIAL_PLAYER_MONEY,
});
