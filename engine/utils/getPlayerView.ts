import {
  GameError,
  GameErrorCodes,
  type GameState,
  type Hotel,
  type HOTEL_NAME,
  type OrcCount,
  type PlayerAction,
  type PlayerView,
} from '../types/index.ts';
import { boardTiles } from '../domain/tileOperations.ts';

const getOrcCount = (amount: number): OrcCount =>
  amount >= 3 ? 'many' : amount === 2 ? '2' : amount === 1 ? '1' : '0';

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

export const getPlayerView = (
  playerName: string,
  gameState: GameState,
  actions: PlayerAction[] = [],
): PlayerView => {
  // Find the player id
  const playerId = gameState.players.findIndex((player) => player.name === playerName);
  if (playerId === -1) {
    throw new GameError(
      `Player ${playerName} doesn't exist in game`,
      GameErrorCodes.GAME_INVALID_ACTION,
    );
  }
  const board = boardTiles(gameState.tiles);
  // Filter actions: only include actions from the player's first action onward that are from recent turns
  const viewableActions = actions.length > 0
    ? (() => {
      const playerActionIndex = actions.findIndex((action) => action.action.includes(playerName));
      if (playerActionIndex === -1) return [];
      return actions
        .slice(playerActionIndex)
        .filter((action) => action.turn >= gameState.currentTurn - 1);
    })()
    : [];
  return {
    gameId: gameState.gameId,
    owner: gameState.owner,
    playerId,
    money: gameState.players[playerId].money,
    stocks: getShares(playerId, gameState.hotels),
    tiles: gameState.tiles.filter((tile) => tile.location === playerId).map((tile) => ({
      row: tile.row,
      col: tile.col,
    })),
    currentPhase: gameState.currentPhase,
    currentTurn: gameState.currentTurn,
    currentPlayer: gameState.currentPlayer,
    pendingMergePlayer: gameState.pendingMergePlayer,
    lastUpdated: gameState.lastUpdated,
    players: gameState.players.map(
      (
        player,
      ) => (
        {
          name: player.name,
          money: getOrcCount(player.money),
          shares: getShares(player.id, gameState.hotels, true),
        }
      ),
    ),
    hotels: gameState.hotels.reduce(
      (hotelShares, hotel) => ({
        ...hotelShares,
        [hotel.name]: {
          shares: hotel.shares.filter((share) => share.location === 'bank').length,
          size: board.filter((tile) => tile.hotel === hotel.name).length,
        },
      }),
      {} as Record<HOTEL_NAME, { shares: number; size: number }>,
    ),
    board,
    mergerTieContext: gameState.mergerTieContext,
    mergeContext: gameState.mergeContext,
    foundHotelContext: gameState.foundHotelContext,
    actions: viewableActions,
    error: gameState.error,
  };
};
