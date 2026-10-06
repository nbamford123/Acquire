import {
  GamePhase,
  type GameState,
  type OrchestratorFunction,
  type PlayerAction,
} from '../types/index.ts';
import {
  boardTiles,
  canBuyShares,
  gameOver,
  getPlayerTiles,
  unplayableReason,
} from '../domain/index.ts';
import {
  drawAndReplaceTilesReducer,
  endGameReducer,
  redrawHandReducer,
} from '../reducers/index.ts';

const endGame = (
  gameState: GameState,
  actions: PlayerAction[] = [],
): [GameState, PlayerAction[]] => {
  const [endGameState, endGameActions] = endGameReducer(gameState);
  return [{
    ...gameState,
    currentPhase: GamePhase.GAME_OVER,
    ...endGameState,
    mergeContext: undefined,
    mergerTieContext: undefined,
    foundHotelContext: undefined,
  }, [...actions, ...endGameActions]];
};

const hasPlayableTile = (gameState: GameState) =>
  getPlayerTiles(gameState.currentPlayer, gameState.tiles)
    .some((tile) => !unplayableReason(tile, gameState.tiles));

// skipped counts players in a row who couldn't place a tile or buy shares
const advanceTurn = (gameState: GameState, skipped: number): [GameState, PlayerAction[]] => {
  const { currentPlayer, currentTurn, players, tiles } = gameState;

  if (gameOver(boardTiles(tiles), gameState.hotels)) {
    return endGame(gameState);
  }
  const nextPlayerId = (currentPlayer + 1) % players.length;
  const turn = nextPlayerId === 0 ? currentTurn + 1 : currentTurn;
  // What happens at the start of the next turn is logged as part of it
  const log = (action: string) => ({ turn, player: nextPlayerId, action });
  let nextState: GameState = {
    ...gameState,
    currentPhase: GamePhase.PLAY_TILE,
    currentPlayer: nextPlayerId,
    currentTurn: turn,
    ...drawAndReplaceTilesReducer(currentPlayer, tiles, players),
    mergeContext: undefined,
    mergerTieContext: undefined,
    foundHotelContext: undefined,
    error: undefined,
  };
  const actions: PlayerAction[] = [];
  const name = players[nextPlayerId].name;

  // A hand with no playable tiles is discarded and redrawn at the start of the turn
  if (getPlayerTiles(nextPlayerId, nextState.tiles).length && !hasPlayableTile(nextState)) {
    nextState = { ...nextState, ...redrawHandReducer(nextPlayerId, nextState.tiles) };
    actions.push(log(
      getPlayerTiles(nextPlayerId, nextState.tiles).length
        ? `${name} had no playable tiles and drew a new hand`
        : `${name} had no playable tiles and discarded them, with none left to draw`,
    ));
  }
  if (hasPlayableTile(nextState)) {
    return [nextState, actions];
  }

  // Still nothing to play, so skip placing a tile
  actions.push(log(`${name} has no playable tiles and skips placing one`));
  if (canBuyShares(players[nextPlayerId].money, nextState.hotels, boardTiles(nextState.tiles))) {
    return [{ ...nextState, currentPhase: GamePhase.BUY_SHARES }, actions];
  }
  if (skipped + 1 >= players.length) {
    // Nobody can do anything, so the game can't continue
    return endGame(nextState, [...actions, log('No one can play, so the game is over')]);
  }
  const [followingState, followingActions] = advanceTurn(nextState, skipped + 1);
  return [followingState, [...actions, ...followingActions]];
};

export const advanceTurnOrchestrator: OrchestratorFunction = (gameState) =>
  advanceTurn(gameState, 0);
