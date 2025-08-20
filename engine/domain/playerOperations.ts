import type { Player } from '../../shared/types/index.ts';
import { INITIAL_PLAYER_MONEY } from '../../shared/types/gameConfig.ts';

export const initializePlayer = (playerName: string): Player => ({
  id: -1,
  name: playerName,
  money: INITIAL_PLAYER_MONEY,
});
