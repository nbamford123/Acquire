import { GamePhase, type GameView, isPlayerView } from '@acquire/engine/types';

// What the current phase asks of the player who needs to act
const task = (view: GameView, whose: 'your' | 'their') => {
  switch (view.currentPhase) {
    case GamePhase.PLAY_TILE:
      return 'play a tile';
    case GamePhase.FOUND_HOTEL:
      return 'found a hotel';
    case GamePhase.BREAK_MERGER_TIE:
      return 'break the merger tie';
    case GamePhase.RESOLVE_MERGER:
      return `sell, trade, or keep ${whose} ${view.mergeContext?.mergedHotel} shares`;
    case GamePhase.BUY_SHARES:
      return 'buy shares';
  }
};

// One line saying whose move it is and what they need to do
export const gameStatus = (view: GameView): string => {
  if (view.finalStandings || view.currentPhase === GamePhase.GAME_OVER) return 'Game over';
  if (view.currentPhase === GamePhase.WAITING_FOR_PLAYERS) return 'Waiting for the game to start';
  // While a merger resolves, each stockholder acts in turn
  const active = view.pendingMergePlayer ?? view.currentPlayer;
  if (isPlayerView(view) && active === view.playerId) return `Your turn: ${task(view, 'your')}`;
  return `Waiting for ${view.players[active]?.name} to ${task(view, 'their')}`;
};
