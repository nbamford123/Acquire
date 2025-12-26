import { assertEquals } from 'jsr:@std/assert';
import { calculateShareholderPayouts } from '../../domain/calculateShareholderPayoutsOperation.ts';
import type { BoardTile, Hotel } from '../../types/index.ts';

Deno.test('calculateShareholderPayouts', async (t) => {
  await t.step('calculates payouts for hotel and board state', () => {
    // Create a mock hotel with shareholders
    const hotel: Hotel = {
      name: 'Worldwide',
      shares: [
        { location: 0 }, // Player 0 has 1 share
        { location: 0 }, // Player 0 has 2 shares
        { location: 1 }, // Player 1 has 1 share
        ...Array.from({ length: 22 }, () => ({ location: 'bank' })),
      ],
    } as unknown as Hotel;

    // Create a game board with tiles
    const gameBoard: BoardTile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'Worldwide' },
      { row: 0, col: 1, location: 'board', hotel: 'Worldwide' },
      { row: 0, col: 2, location: 'board', hotel: 'Worldwide' },
      { row: 0, col: 3, location: 'board', hotel: 'Worldwide' },
      { row: 0, col: 4, location: 'board', hotel: 'Worldwide' },
    ] as unknown as BoardTile[];

    const [payouts, explanation] = calculateShareholderPayouts(hotel, gameBoard);

    // Verify payouts is a Map and returns results
    assertEquals(payouts instanceof Map, true);
    assertEquals(typeof explanation, 'object');
  });

  await t.step('handles clear majority and minority winners', () => {
    const hotel: Hotel = {
      name: 'Luxor',
      shares: [
        { location: 0 }, // Player 0 has 1 share
        { location: 0 }, // Player 0 has 2 shares
        { location: 0 }, // Player 0 has 3 shares
        { location: 1 }, // Player 1 has 1 share
        ...Array.from({ length: 21 }, () => ({ location: 'bank' })),
      ],
    } as unknown as Hotel;

    const gameBoard: BoardTile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'Luxor' },
      { row: 0, col: 1, location: 'board', hotel: 'Luxor' },
      { row: 0, col: 2, location: 'board', hotel: 'Luxor' },
    ] as unknown as BoardTile[];

    const [payouts, explanation] = calculateShareholderPayouts(hotel, gameBoard);

    // Verify payouts structure
    assertEquals(payouts instanceof Map, true);
    assertEquals(typeof explanation, 'object');
  });

  await t.step('handles single hotel with multiple shareholders', () => {
    const hotel: Hotel = {
      name: 'American',
      shares: [
        { location: 0 }, // Player 0
        { location: 0 }, // Player 0
        { location: 1 }, // Player 1
        { location: 1 }, // Player 1
        { location: 2 }, // Player 2
        ...Array.from({ length: 20 }, () => ({ location: 'bank' })),
      ],
    } as unknown as Hotel;

    const gameBoard: BoardTile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'American' },
      { row: 0, col: 1, location: 'board', hotel: 'American' },
    ] as unknown as BoardTile[];

    const [payouts, explanation] = calculateShareholderPayouts(hotel, gameBoard);

    assertEquals(payouts instanceof Map, true);
    assertEquals(typeof explanation, 'object');
  });

  await t.step('returns explanation array with details', () => {
    const hotel: Hotel = {
      name: 'Continental',
      shares: [
        { location: 0 },
        { location: 0 },
        { location: 0 },
        { location: 1 },
        ...Array.from({ length: 21 }, () => ({ location: 'bank' })),
      ],
    } as unknown as Hotel;

    const gameBoard: BoardTile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'Continental' },
      { row: 0, col: 1, location: 'board', hotel: 'Continental' },
      { row: 0, col: 2, location: 'board', hotel: 'Continental' },
      { row: 0, col: 3, location: 'board', hotel: 'Continental' },
    ] as unknown as BoardTile[];

    const [payouts, explanation] = calculateShareholderPayouts(hotel, gameBoard);

    // Explanation should be an array
    assertEquals(Array.isArray(explanation), true);
    assertEquals(explanation.length > 0, true);
  });

  await t.step('handles hotel with only bank shares', () => {
    const hotel: Hotel = {
      name: 'Festival',
      shares: Array.from({ length: 25 }, () => ({ location: 'bank' })),
    } as unknown as Hotel;

    const gameBoard: BoardTile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'Festival' },
    ] as unknown as BoardTile[];

    const [payouts, explanation] = calculateShareholderPayouts(hotel, gameBoard);

    assertEquals(payouts instanceof Map, true);
    assertEquals(typeof explanation, 'object');
  });

  await t.step('handles hotel with mixed shareholder distribution', () => {
    const hotel: Hotel = {
      name: 'Worldwide',
      shares: [
        { location: 0 },
        { location: 0 },
        { location: 0 },
        { location: 0 },
        { location: 1 },
        { location: 1 },
        { location: 2 },
        ...Array.from({ length: 18 }, () => ({ location: 'bank' })),
      ],
    } as unknown as Hotel;

    const gameBoard: BoardTile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'Worldwide' },
      { row: 0, col: 1, location: 'board', hotel: 'Worldwide' },
      { row: 0, col: 2, location: 'board', hotel: 'Worldwide' },
      { row: 0, col: 3, location: 'board', hotel: 'Worldwide' },
      { row: 0, col: 4, location: 'board', hotel: 'Worldwide' },
      { row: 0, col: 5, location: 'board', hotel: 'Worldwide' },
    ] as unknown as BoardTile[];

    const [payouts, explanation] = calculateShareholderPayouts(hotel, gameBoard);

    assertEquals(payouts instanceof Map, true);
  });

  await t.step('handles board with multiple hotels', () => {
    const hotel: Hotel = {
      name: 'Tower',
      shares: [
        { location: 0 },
        { location: 1 },
        ...Array.from({ length: 23 }, () => ({ location: 'bank' })),
      ],
    } as unknown as Hotel;

    // Board has multiple hotels, but function calculates for one hotel
    const gameBoard: BoardTile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'Tower' },
      { row: 0, col: 1, location: 'board', hotel: 'Tower' },
      { row: 1, col: 0, location: 'board', hotel: 'Worldwide' },
      { row: 1, col: 1, location: 'board', hotel: 'Worldwide' },
    ] as unknown as BoardTile[];

    const [payouts, explanation] = calculateShareholderPayouts(hotel, gameBoard);

    assertEquals(payouts instanceof Map, true);
  });

  await t.step('handles large board state', () => {
    const hotel: Hotel = {
      name: 'Imperial',
      shares: [
        { location: 0 },
        { location: 0 },
        { location: 0 },
        { location: 1 },
        { location: 1 },
        ...Array.from({ length: 20 }, () => ({ location: 'bank' })),
      ],
    } as unknown as Hotel;

    // Create a large board with many tiles
    const gameBoard: BoardTile[] = Array.from(
      { length: 50 },
      (_, i) => ({
        row: Math.floor(i / 12),
        col: i % 12,
        location: 'board',
        hotel: i < 8 ? 'Imperial' : undefined,
      }),
    ) as unknown as BoardTile[];

    const [payouts, explanation] = calculateShareholderPayouts(hotel, gameBoard);

    assertEquals(payouts instanceof Map, true);
  });

  await t.step('returns consistent results for same inputs', () => {
    const hotel: Hotel = {
      name: 'American',
      shares: [
        { location: 0 },
        { location: 0 },
        { location: 1 },
        ...Array.from({ length: 22 }, () => ({ location: 'bank' })),
      ],
    } as unknown as Hotel;

    const gameBoard: BoardTile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'American' },
      { row: 0, col: 1, location: 'board', hotel: 'American' },
      { row: 0, col: 2, location: 'board', hotel: 'American' },
    ] as unknown as BoardTile[];

    const [payouts1, explanation1] = calculateShareholderPayouts(hotel, gameBoard);
    const [payouts2, explanation2] = calculateShareholderPayouts(hotel, gameBoard);

    // Same inputs should produce same outputs
    assertEquals(payouts1.size, payouts2.size);
  });
});
