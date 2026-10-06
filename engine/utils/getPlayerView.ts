import {
  CASH_TIER_LIMITS,
  type CashTier,
  GameError,
  GameErrorCodes,
  GamePhase,
  type GameState,
  type GameView,
  type Hotel,
  type HOTEL_NAME,
  type OrcCount,
  type PlayerAction,
  type PlayerView,
} from '../types/index.ts';
import { boardTiles } from '../domain/tileOperations.ts';
import { unplayableReason } from '../domain/analyzeTilePlacement.ts';
import { getActivePlayer } from './getActivePlayer.ts';

const getOrcCount = (amount: number): OrcCount =>
  amount >= 3 ? 'many' : amount === 2 ? '2' : amount === 1 ? '1' : '0';

export const getCashTier = (money: number): CashTier => {
  const tier = CASH_TIER_LIMITS.findIndex((limit) => money < limit);
  return (tier === -1 ? CASH_TIER_LIMITS.length + 1 : tier + 1) as CashTier;
};

function getShares(playerId: number, hotels: Hotel[], orcCount: true): Record<HOTEL_NAME, OrcCount>;
function getShares(playerId: number, hotels: Hotel[], orcCount?: false): Record<HOTEL_NAME, number>;
function getShares(playerId: number, hotels: Hotel[], orcCount: boolean = false) {
  return hotels.reduce((playerShares, hotel) => {
    const shares = hotel.shares.filter((share) => share.location === playerId);
    if (shares.length) {
      playerShares[hotel.name] = orcCount ? getOrcCount(shares.length) : shares.length;
    }
    return playerShares;
  }, {} as Record<HOTEL_NAME, number | OrcCount>);
}

// The log starts at logPlayer's last finished turn, so a player sees what they did and everything
// since. Until they've finished a turn, it shows the whole game.
const actionsSince = (gameState: GameState, actions: PlayerAction[], logPlayer: number) => {
  const sameTurn = (a: PlayerAction, b: { turn: number; player?: number }) =>
    a.turn === b.turn && a.player === b.player;
  const current = { turn: gameState.currentTurn, player: gameState.currentPlayer };
  const lastTurn = actions.findLast((action) =>
    action.player === logPlayer && !sameTurn(action, current)
  );
  return lastTurn
    ? actions.slice(actions.findIndex((action) => sameTurn(action, lastTurn)))
    : actions;
};

const getGameView = (
  gameState: GameState,
  actions: PlayerAction[],
  logPlayer: number,
): GameView => {
  const board = boardTiles(gameState.tiles);
  return {
    gameId: gameState.gameId,
    owner: gameState.owner,
    currentPhase: gameState.currentPhase,
    currentTurn: gameState.currentTurn,
    currentPlayer: gameState.currentPlayer,
    pendingMergePlayer: gameState.currentPhase === GamePhase.RESOLVE_MERGER
      ? getActivePlayer(gameState)
      : undefined,
    lastUpdated: gameState.lastUpdated,
    players: gameState.players.map((player) => ({
      name: player.name,
      money: getCashTier(player.money),
      shares: getShares(player.id, gameState.hotels, true),
    })),
    hotels: gameState.hotels.reduce(
      (hotelShares, hotel) => ({
        ...hotelShares,
        [hotel.name]: {
          shares: hotel.shares.filter((share) => share.location === 'bank').length,
          size: board.filter((tile) => tile.hotel === hotel.name).length,
          ...(hotel.marker ? { marker: hotel.marker } : {}),
        },
      }),
      {} as GameView['hotels'],
    ),
    board,
    mergerTieContext: gameState.mergerTieContext,
    mergeContext: gameState.mergeContext,
    foundHotelContext: gameState.foundHotelContext,
    finalStandings: gameState.currentPhase === GamePhase.GAME_OVER
      ? gameState.players
        .map(({ name, money }) => ({ name, money }))
        .sort((a, b) => b.money - a.money)
      : undefined,
    actions: actionsSince(gameState, actions, logPlayer),
    error: gameState.error,
  };
};

// What someone watching a game they're not in sees. With no turns of their own, their log starts
// at the current player's last turn, which is the last full round.
export const getSpectatorView = (
  gameState: GameState,
  actions: PlayerAction[] = [],
): GameView => getGameView(gameState, actions, gameState.currentPlayer);

export const getPlayerView = (
  playerName: string,
  gameState: GameState,
  actions: PlayerAction[] = [],
): PlayerView => {
  const playerId = gameState.players.findIndex((player) => player.name === playerName);
  if (playerId === -1) {
    throw new GameError(
      `Player ${playerName} doesn't exist in game`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  return {
    ...getGameView(gameState, actions, playerId),
    playerId,
    money: gameState.players[playerId].money,
    stocks: getShares(playerId, gameState.hotels),
    tiles: gameState.tiles.filter((tile) => tile.location === playerId).map((tile) => {
      const unplayable = unplayableReason(tile, gameState.tiles);
      return { row: tile.row, col: tile.col, ...(unplayable ? { unplayable } : {}) };
    }),
  };
};
