// gameEngine.ts - Pure game logic with no side effects
import type { GameAction, GameState, PlayerAction } from '../types/index.ts';
import { rootReducer } from '../reducers/rootReducer.ts';

export function processAction(state: GameState, action: GameAction): [GameState, PlayerAction[]] {
  // Process the action through our reducer system
  const [newState, newActions] = rootReducer(state, action);

  // Game rule enforcement, win condition checking, etc.
  const finalState = checkGameRules(newState, state);

  return [finalState, newActions];
}

function checkGameRules(newState: GameState, _previousState: GameState): GameState {
  // Check for win conditions, game completion, etc.
  // Could return modified state with additional properties like gameOver: true
  return newState;
}
