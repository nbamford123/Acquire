import { assertEquals } from '@std/assert';
import { gameOver } from '../endGameOperations.ts';
import type { BoardTile, Hotel } from '../../types/index.ts';

Deno.test('gameOver', async (t) => {
  await t.step('returns false when no hotels exist', () => {
    const board: BoardTile[] = [];
    const hotels: Hotel[] = [];

    const result = gameOver(board, hotels);
    assertEquals(result, false);
  });

  await t.step('returns false when hotel has fewer than safe size tiles', () => {
    const board: BoardTile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'Tower' },
      { row: 0, col: 1, location: 'board', hotel: 'Tower' },
    ] as unknown as BoardTile[];

    const hotels: Hotel[] = [
      {
        name: 'Tower',
        shares: Array.from({ length: 25 }, () => ({ location: 'bank' })),
      },
    ] as unknown as Hotel[];

    const result = gameOver(board, hotels);
    assertEquals(result, false);
  });

  await t.step('returns true when the only hotel on the board is safe', () => {
    const board: BoardTile[] = Array.from(
      { length: 11 },
      (_, i) => ({
        row: Math.floor(i / 12),
        col: i % 12,
        location: 'board',
        hotel: 'Tower',
      }),
    ) as unknown as BoardTile[];

    const hotels: Hotel[] = [
      {
        name: 'Tower',
        shares: Array.from({ length: 25 }, () => ({ location: 'bank' })),
      },
    ] as unknown as Hotel[];

    const result = gameOver(board, hotels);
    assertEquals(result, true);
  });

  await t.step('returns false when all hotels exist but none are safe or end game size', () => {
    const board: BoardTile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'Tower' },
      { row: 0, col: 1, location: 'board', hotel: 'Luxor' },
      { row: 0, col: 2, location: 'board', hotel: 'Worldwide' },
    ] as unknown as BoardTile[];

    const hotels: Hotel[] = [
      {
        name: 'Tower',
        shares: Array.from({ length: 25 }, () => ({ location: 'bank' })),
      },
      {
        name: 'Luxor',
        shares: Array.from({ length: 25 }, () => ({ location: 'bank' })),
      },
      {
        name: 'Worldwide',
        shares: Array.from({ length: 25 }, () => ({ location: 'bank' })),
      },
    ] as unknown as Hotel[];

    const result = gameOver(board, hotels);
    assertEquals(result, false);
  });

  await t.step('returns true when all hotels are safe', () => {
    const board: BoardTile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'Tower' },
      { row: 0, col: 1, location: 'board', hotel: 'Tower' },
      { row: 0, col: 2, location: 'board', hotel: 'Tower' },
      { row: 0, col: 3, location: 'board', hotel: 'Tower' },
      { row: 0, col: 4, location: 'board', hotel: 'Tower' },
      { row: 0, col: 5, location: 'board', hotel: 'Tower' },
      { row: 0, col: 6, location: 'board', hotel: 'Tower' },
      { row: 0, col: 7, location: 'board', hotel: 'Tower' },
      { row: 0, col: 8, location: 'board', hotel: 'Tower' },
      { row: 0, col: 9, location: 'board', hotel: 'Tower' },
      { row: 0, col: 10, location: 'board', hotel: 'Tower' },
      { row: 1, col: 0, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 1, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 2, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 3, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 4, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 5, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 6, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 7, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 8, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 9, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 10, location: 'board', hotel: 'Luxor' },
    ] as unknown as BoardTile[];

    const hotels: Hotel[] = [
      {
        name: 'Tower',
        shares: Array.from({ length: 25 }, () => ({ location: 'bank' })),
      },
      {
        name: 'Luxor',
        shares: Array.from({ length: 25 }, () => ({ location: 'bank' })),
      },
    ] as unknown as Hotel[];

    const result = gameOver(board, hotels);
    assertEquals(result, true);
  });

  const hotel = (name: string) =>
    ({ name, shares: Array.from({ length: 25 }, () => ({ location: 'bank' })) }) as unknown as Hotel;
  // Lays out hotels row by row, 12 tiles per row
  const boardWith = (sizes: Record<string, number>) => {
    const board: BoardTile[] = [];
    for (const [name, size] of Object.entries(sizes)) {
      for (let i = 0; i < size; i++) {
        const index = board.length;
        board.push({ row: Math.floor(index / 12), col: index % 12, location: 'board', hotel: name } as BoardTile);
      }
    }
    return board;
  };
  const allHotels = ['Tower', 'Luxor', 'Worldwide', 'American'].map(hotel);

  await t.step('returns false when one hotel is safe but another is not', () => {
    assertEquals(gameOver(boardWith({ Tower: 11, Luxor: 5 }), allHotels), false);
  });

  await t.step('ignores hotels not on the board when checking all safe', () => {
    assertEquals(gameOver(boardWith({ Tower: 11, Luxor: 12 }), allHotels), true);
  });

  await t.step('returns true when a hotel reaches 41 tiles', () => {
    assertEquals(gameOver(boardWith({ Tower: 41, Luxor: 3 }), allHotels), true);
  });

  await t.step('returns false when the largest hotel has 40 tiles and another is unsafe', () => {
    assertEquals(gameOver(boardWith({ Tower: 40, Luxor: 3 }), allHotels), false);
  });

  await t.step('returns false when no hotel is on the board', () => {
    assertEquals(gameOver([], allHotels), false);
  });
});
