import { assert, assertEquals } from 'jsr:@std/assert';
import { drawInitialTiles } from '../../domain/drawInitialTiles.ts';
import { type Player, type Tile } from '../../types/index.ts';

function makeTile(row: number, col: number): Tile {
  return { row, col, location: 'bag' } as Tile;
}

Deno.test('drawInitialTiles basic behavior', () => {
  const tiles: Tile[] = [];
  for (let r = 0; r < 10; r++) tiles.push(makeTile(r, 0));

  const players: Player[] = [
    { id: -1, name: 'Alice', money: 0 },
    { id: -1, name: 'Bob', money: 0 },
    { id: -1, name: 'Carol', money: 0 },
  ];

  const { sortedPlayers, updatedTiles } = drawInitialTiles(tiles, players);

  // We should still have the same number of tiles after drawing
  assertEquals(updatedTiles.length, tiles.length);

  // Number of board tiles should be equal to number of players
  const boardCount = updatedTiles.filter((t) => t.location === 'board').length;
  assertEquals(boardCount, players.length);

  // sortedPlayers should be same length and have ids 0..n-1
  assertEquals(sortedPlayers.length, players.length);
  const ids = sortedPlayers.map((p) => p.id).sort((a, b) => a - b);
  assertEquals(ids, [0, 1, 2]);
});
