import type { Player } from '@/engine/types/index.ts';
import { INITIAL_PLAYER_MONEY } from '@/engine/config/gameConfig.ts';

export const initializePlayer = (playerName: string): Player => ({
  id: -1,
  name: playerName,
  money: INITIAL_PLAYER_MONEY,
  shares: {},
  tiles: [],
});
