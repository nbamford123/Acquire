import { describe, test, expect } from '@jest/globals';
import { Tiles, COLS, CHARACTER_CODE_A, ROWS } from './Tile';

describe('Tiles', () => {
  test('Has a 9x12 board of tiles', () => {
    const bag = new Tiles();
    expect(bag.tiles.flat().length).toBe(ROWS * COLS);
  });

  test('Tiles are all in bag', () => {
    const bag = new Tiles();
    expect(bag.tiles.flat().every((tile) => tile.location === 'bag')).toEqual(
      true,
    );
  });
  test('Tiles have appropriate label', () => {
    const bag = new Tiles();
    for (let i = 0; i < ROWS; i++)
      for (let j = 0; j < COLS; j++) {
        expect(bag.tiles[i][j].label).toEqual(
          `${i + 1}${String.fromCharCode(j + CHARACTER_CODE_A)}`,
        );
      }
  });
  test('can draw random tiles', () => {
    const bag = new Tiles();
    const myTiles = bag.drawTiles('player1', 6);
    expect(myTiles).toHaveLength(6);
    // Surely the first one won't be 0,0
    const position = [myTiles[0].row, myTiles[0].col];
    expect(position).not.toEqual([0, 0]);
  });
  test('has tiles assigned after draw', () => {
    const bag = new Tiles();
    const myTiles = bag.drawTiles('player1', 6);
    expect(myTiles.every((tile) => tile.location === 'player1')).toBeTruthy();
    expect(
      bag.tiles.flat().filter((tile) => tile.location === 'bag'),
    ).toHaveLength(ROWS * COLS - 6);
  });
  test('only returns available tiles when more requested', () => {
    const bag = new Tiles();
    bag.drawTiles('player1', 100);
    const myTiles = bag.drawTiles('player1', 10);
    expect(myTiles).toHaveLength(8);
  });
});
