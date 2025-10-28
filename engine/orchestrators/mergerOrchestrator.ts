import {
  GamePhase,
  type GameState,
  type Hotel,
  type MergeContext,
  type Player,
  type ResolvedTie,
  type Tile,
} from '../types/index.ts';
import { boardTiles, mergeHotels } from '../domain/index.ts';
import { prepareMergerReducer } from '../reducers/prepareMergerReducer.ts';

export const processMerger = (
  tiles: Tile[],
  mergeContext: MergeContext,
  players: Player[],
  hotels: Hotel[],
  resolvedTie?: ResolvedTie,
): Partial<GameState> => {
  const gameBoard = boardTiles(tiles);
  const result = mergeHotels(
    mergeContext,
    gameBoard,
    resolvedTie,
  );
  // Found a tie, send back to player for resolution
  if (result.needsMergeOrder) {
    return {
      currentPhase: GamePhase.BREAK_MERGER_TIE,
      mergerTieContext: {
        tiedHotels: result.tiedHotels,
      },
      mergeContext: { ...mergeContext, ...result.mergeContext },
    };
  }
  return {
    ...prepareMergerReducer(
      players,
      tiles,
      hotels,
      result,
    ),
  };
};
