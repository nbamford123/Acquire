import { test, expect } from '@jest/globals';

import { sortTiles } from './utils';

test('sorts correctly when columns differ', () => {
  expect(
    sortTiles(
      { row: 0, col: 0, location: '' },
      { row: 0, col: 1, location: '' },
    ),
  ).toEqual(-1);
  expect(
    sortTiles(
      { row: 0, col: 12, location: '' },
      { row: 0, col: 10, location: '' },
    ),
  ).toEqual(1);
});
test('sorts correctly when columns are the same, but rows differ', () => {
  expect(
    sortTiles(
      { row: 0, col: 0, location: '' },
      { row: 1, col: 0, location: '' },
    ),
  ).toEqual(-1);
  expect(
    sortTiles(
      { row: 7, col: 12, location: '' },
      { row: 6, col: 12, location: '' },
    ),
  ).toEqual(1);
});
