import { assertEquals, assertNotEquals } from 'jsr:@std/assert';
import type { Tile } from '@/types/tile.ts';

import { cmpTiles, filterDefined, getAdjacentPositions, shuffleTiles, sortTiles } from './index.ts';

// Test data helpers
const createTile = (
  row: number,
  col: number,
  location: 'board' | 'bag' | 'dead' | number = 'board',
): Tile => ({
  row,
  col,
  location,
});

// cmpTiles tests
Deno.test('cmpTiles - sorts correctly when columns differ', () => {
  assertEquals(
    cmpTiles(
      createTile(0, 0),
      createTile(0, 1),
    ),
    -1,
  );
  assertEquals(
    cmpTiles(
      createTile(0, 12),
      createTile(0, 10),
    ),
    1,
  );
});

Deno.test('cmpTiles - sorts correctly when columns are the same, but rows differ', () => {
  assertEquals(
    cmpTiles(
      createTile(0, 0),
      createTile(1, 0),
    ),
    -1,
  );
  assertEquals(
    cmpTiles(
      createTile(7, 12),
      createTile(6, 12),
    ),
    1,
  );
});

Deno.test('cmpTiles - returns 0 when tiles are identical', () => {
  assertEquals(
    cmpTiles(
      createTile(5, 3),
      createTile(5, 3),
    ),
    0,
  );
});

Deno.test('cmpTiles - handles edge cases with different locations', () => {
  assertEquals(
    cmpTiles(
      createTile(0, 0, 'bag'),
      createTile(0, 1, 'board'),
    ),
    -1,
  );
  assertEquals(
    cmpTiles(
      createTile(5, 3, 1),
      createTile(5, 3, 2),
    ),
    0,
  );
});

// fiterDefinedTests
Deno.test('filterDefined - removes undefined and null values', () => {
  assertEquals(filterDefined([1, null, 2, undefined, 3]), [1, 2, 3]);
});

Deno.test('filterDefined - returns empty array with array input', () => {
  assertEquals(filterDefined([]), []);
});

// getAdjacentPositions tests
Deno.test('getAdjacentPositions - returns correct adjacent positions for center tile', () => {
  const adjacent = getAdjacentPositions(5, 4);
  assertEquals(adjacent.length, 4);
  assertEquals(adjacent, [[4, 4], [6, 4], [5, 3], [5, 5]]);
});

Deno.test('getAdjacentPositions - handles top-left corner', () => {
  const adjacent = getAdjacentPositions(0, 0);
  assertEquals(adjacent.length, 2);
  assertEquals(adjacent, [[1, 0], [0, 1]]);
});

Deno.test('getAdjacentPositions - handles top-right corner', () => {
  const adjacent = getAdjacentPositions(0, 8);
  assertEquals(adjacent.length, 2);
  assertEquals(adjacent, [[1, 8], [0, 7]]);
});

Deno.test('getAdjacentPositions - handles bottom-left corner', () => {
  const adjacent = getAdjacentPositions(11, 0);
  assertEquals(adjacent.length, 2);
  assertEquals(adjacent, [[10, 0], [11, 1]]);
});

Deno.test('getAdjacentPositions - handles bottom-right corner', () => {
  const adjacent = getAdjacentPositions(11, 8);
  assertEquals(adjacent.length, 2);
  assertEquals(adjacent, [[10, 8], [11, 7]]);
});

Deno.test('getAdjacentPositions - handles top edge', () => {
  const adjacent = getAdjacentPositions(0, 4);
  assertEquals(adjacent.length, 3);
  assertEquals(adjacent, [[1, 4], [0, 3], [0, 5]]);
});

Deno.test('getAdjacentPositions - handles bottom edge', () => {
  const adjacent = getAdjacentPositions(11, 4);
  assertEquals(adjacent.length, 3);
  assertEquals(adjacent, [[10, 4], [11, 3], [11, 5]]);
});

Deno.test('getAdjacentPositions - handles left edge', () => {
  const adjacent = getAdjacentPositions(5, 0);
  assertEquals(adjacent.length, 3);
  assertEquals(adjacent, [[4, 0], [6, 0], [5, 1]]);
});

Deno.test('getAdjacentPositions - handles right edge', () => {
  const adjacent = getAdjacentPositions(5, 8);
  assertEquals(adjacent.length, 3);
  assertEquals(adjacent, [[4, 8], [6, 8], [5, 7]]);
});

// shuffleTiles tests
Deno.test('shuffleTiles - returns array of same length', () => {
  const tiles = [
    createTile(0, 0),
    createTile(0, 1),
    createTile(1, 0),
    createTile(1, 1),
  ];
  const shuffled = shuffleTiles(tiles);
  assertEquals(shuffled.length, tiles.length);
});

Deno.test('shuffleTiles - does not modify original array', () => {
  const tiles = [
    createTile(0, 0),
    createTile(0, 1),
    createTile(1, 0),
  ];
  const original = [...tiles];
  shuffleTiles(tiles);
  assertEquals(tiles, original);
});

Deno.test('shuffleTiles - contains all original elements', () => {
  const tiles = [
    createTile(0, 0),
    createTile(0, 1),
    createTile(1, 0),
    createTile(1, 1),
    createTile(2, 2),
  ];
  const shuffled = shuffleTiles(tiles);

  // Check that all original tiles are present
  for (const tile of tiles) {
    const found = shuffled.find((t) =>
      t.row === tile.row &&
      t.col === tile.col &&
      t.location === tile.location
    );
    assertEquals(found !== undefined, true);
  }
});

Deno.test('shuffleTiles - handles empty array', () => {
  const tiles: Tile[] = [];
  const shuffled = shuffleTiles(tiles);
  assertEquals(shuffled.length, 0);
});

Deno.test('shuffleTiles - handles single element array', () => {
  const tiles = [createTile(0, 0)];
  const shuffled = shuffleTiles(tiles);
  assertEquals(shuffled.length, 1);
  assertEquals(shuffled[0], tiles[0]);
});

// Note: Testing true randomness is difficult, but we can test that the function
// can produce different results (though this test might occasionally fail due to randomness)
Deno.test('shuffleTiles - can produce different arrangements', () => {
  const tiles = [
    createTile(0, 0),
    createTile(0, 1),
    createTile(1, 0),
    createTile(1, 1),
    createTile(2, 0),
    createTile(2, 1),
    createTile(3, 0),
    createTile(3, 1),
  ];

  // Run shuffle multiple times to increase chance of different arrangement
  let foundDifferentArrangement = false;
  for (let i = 0; i < 10; i++) {
    const shuffled = shuffleTiles(tiles);
    let isDifferent = false;
    for (let j = 0; j < tiles.length; j++) {
      if (tiles[j].row !== shuffled[j].row || tiles[j].col !== shuffled[j].col) {
        isDifferent = true;
        break;
      }
    }
    if (isDifferent) {
      foundDifferentArrangement = true;
      break;
    }
  }
  // This test might occasionally fail due to randomness, but it's very unlikely
  assertEquals(foundDifferentArrangement, true);
});

// sortTiles tests
Deno.test('sortTiles - sorts by column first, then by row', () => {
  const tiles = [
    createTile(2, 1),
    createTile(1, 2),
    createTile(1, 1),
    createTile(2, 2),
  ];
  const sorted = sortTiles(tiles);
  assertEquals(sorted, [
    createTile(1, 1),
    createTile(2, 1),
    createTile(1, 2),
    createTile(2, 2),
  ]);
});

Deno.test('sortTiles - handles tiles with same column, different rows', () => {
  const tiles = [
    createTile(3, 1),
    createTile(1, 1),
    createTile(2, 1),
  ];
  const sorted = sortTiles(tiles);
  assertEquals(sorted, [
    createTile(1, 1),
    createTile(2, 1),
    createTile(3, 1),
  ]);
});

Deno.test('sortTiles - handles tiles with different columns, same row', () => {
  const tiles = [
    createTile(1, 3),
    createTile(1, 1),
    createTile(1, 2),
  ];
  const sorted = sortTiles(tiles);
  assertEquals(sorted, [
    createTile(1, 1),
    createTile(1, 2),
    createTile(1, 3),
  ]);
});

Deno.test('sortTiles - handles already sorted array', () => {
  const tiles = [
    createTile(1, 1),
    createTile(2, 1),
    createTile(1, 2),
    createTile(2, 2),
  ];
  const sorted = sortTiles(tiles);
  assertEquals(sorted, tiles);
});

Deno.test('sortTiles - handles reverse sorted array', () => {
  const tiles = [
    createTile(2, 2),
    createTile(1, 2),
    createTile(2, 1),
    createTile(1, 1),
  ];
  const sorted = sortTiles(tiles);
  assertEquals(sorted, [
    createTile(1, 1),
    createTile(2, 1),
    createTile(1, 2),
    createTile(2, 2),
  ]);
});

Deno.test('sortTiles - handles empty array', () => {
  const tiles: Tile[] = [];
  const sorted = sortTiles(tiles);
  assertEquals(sorted.length, 0);
});

Deno.test('sortTiles - handles single element array', () => {
  const tiles = [createTile(5, 3)];
  const sorted = sortTiles(tiles);
  assertEquals(sorted.length, 1);
  assertEquals(sorted[0], tiles[0]);
});

Deno.test('sortTiles - handles identical tiles', () => {
  const tiles = [
    createTile(1, 1),
    createTile(1, 1),
    createTile(1, 1),
  ];
  const sorted = sortTiles(tiles);
  assertEquals(sorted.length, 3);
  assertEquals(sorted, tiles);
});

Deno.test('sortTiles - modifies original array (in-place sort)', () => {
  const tiles = [
    createTile(2, 1),
    createTile(1, 2),
    createTile(1, 1),
  ];
  const originalReference = tiles;
  const sorted = sortTiles(tiles);

  // sortTiles should return the same reference (in-place sort)
  assertEquals(sorted === originalReference, true);
  assertEquals(tiles, [
    createTile(1, 1),
    createTile(2, 1),
    createTile(1, 2),
  ]);
});

Deno.test('sortTiles - handles tiles with different locations', () => {
  const tiles = [
    createTile(1, 2, 'bag'),
    createTile(1, 1, 'board'),
    createTile(1, 1, 1),
    createTile(1, 2, 'dead'),
  ];
  const sorted = sortTiles(tiles);
  assertEquals(sorted, [
    createTile(1, 1, 'board'),
    createTile(1, 1, 1),
    createTile(1, 2, 'bag'),
    createTile(1, 2, 'dead'),
  ]);
});
