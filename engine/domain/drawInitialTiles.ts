import { cmpTiles, shuffleTiles } from '../utils/index.ts';
import { updateTiles } from './tileOperations.ts';
import { type Player, type Tile } from '../types/index.ts';

// Draw tiles to determine player order. Returns players with id set to turn order and updated tiles
export const drawInitialTiles = (
  tiles: Tile[],
  players: Player[],
): { sortedPlayers: Player[]; playedTiles: Tile[] } => {
  // Shuffle and draw initial tiles
  const shuffledTiles = shuffleTiles(tiles);
  const playedTiles: Tile[] = [];
  const playerMap: Record<string, Tile> = {};
  for (const player of players) {
    const playerTile = shuffledTiles.shift()!;
    playerTile.location = 'board';
    playedTiles.push(playerTile);
    playerMap[player.name] = playerTile;
  }
  // Sort the players by first drawn tile and give them an id based on their position
  const sortedPlayers = players.sort((p1, p2) => cmpTiles(playerMap[p1.name], playerMap[p2.name]))
    .map((p, idx) => ({ ...p, id: idx }));
  return { sortedPlayers, playedTiles };
};
