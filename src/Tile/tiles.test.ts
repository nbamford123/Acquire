import { test, expect } from '@jest/globals';
import { Tiles } from './Tile';

test('Has a 12x9 board of tiles', () => {
  const bag = new Tiles();
  expect(bag.tiles.length).toBe(9);
  bag.tiles.forEach((row) => expect(row.length).toBe(12));
});

test('Tiles are all in bag', () => {
  const bag = new Tiles();
  expect(
    bag.tiles.every((col) => col.every((tile) => tile.location === 'bag')),
  ).toEqual(true);
});
