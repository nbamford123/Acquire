import { assertEquals, assertThrows } from '@std/assert';
import { analyzeTilePlacement, unplayableReason } from '../analyzeTilePlacement.ts';
import { playTileValidation } from '../playTileValidation.ts';
import {
  GameError,
  GameErrorCodes,
  HOTEL_NAMES,
  type HOTEL_NAME,
  SAFE_HOTEL_SIZE,
  type Tile,
} from '../../types/index.ts';

const boardTile = (row: number, col: number, hotel?: HOTEL_NAME) =>
  ({ row, col, location: 'board', ...(hotel ? { hotel } : {}) }) as Tile;

// Every hotel on the board (2 tiles each, rows 0-6 at the right edge) plus a loose tile at 1I
const allHotelsTiles = (): Tile[] => [
  ...HOTEL_NAMES.flatMap((hotel, row) => [boardTile(row, 10, hotel), boardTile(row, 11, hotel)]),
  boardTile(8, 0),
];

Deno.test('analyzeTilePlacement - touching one hotel on two sides grows it', () => {
  // Filling in the corner of an L-shaped hotel
  const tiles = [boardTile(0, 0, 'Tower'), boardTile(0, 1, 'Tower'), boardTile(1, 0, 'Tower')];
  const result = analyzeTilePlacement({ row: 1, col: 1, location: 0 } as Tile, tiles);
  assertEquals(result.adjacentHotels, ['Tower']);
  assertEquals(result.growsHotel, true);
  assertEquals(result.triggersMerger, false);
});

Deno.test('unplayableReason', async (t) => {
  await t.step('allows ordinary placements', () => {
    assertEquals(unplayableReason({ row: 4, col: 4 }, []), undefined);
    // Founding while hotels are still available
    assertEquals(unplayableReason({ row: 4, col: 5 }, [boardTile(4, 4)]), undefined);
  });

  await t.step('rejects merging two safe hotels', () => {
    const tiles: Tile[] = [];
    for (let row = 0; row < SAFE_HOTEL_SIZE; row++) {
      tiles.push(boardTile(row, 0, 'Tower'), boardTile(row, 2, 'Luxor'));
    }
    assertEquals(unplayableReason({ row: 5, col: 1 }, tiles), 'it would merge two safe hotels');
  });

  await t.step('allows merging a safe hotel with an unsafe one', () => {
    const tiles: Tile[] = [boardTile(5, 2, 'Luxor'), boardTile(6, 2, 'Luxor')];
    for (let row = 0; row < SAFE_HOTEL_SIZE; row++) tiles.push(boardTile(row, 0, 'Tower'));
    assertEquals(unplayableReason({ row: 5, col: 1 }, tiles), undefined);
  });

  await t.step('rejects founding a hotel when every hotel is on the board', () => {
    assertEquals(
      unplayableReason({ row: 8, col: 1 }, allHotelsTiles()),
      'all hotels are already on the board',
    );
  });

  await t.step('allows growing a hotel or a lone tile when every hotel is on the board', () => {
    assertEquals(unplayableReason({ row: 0, col: 9 }, allHotelsTiles()), undefined);
    assertEquals(unplayableReason({ row: 4, col: 4 }, allHotelsTiles()), undefined);
  });
});

Deno.test('playTileValidation rejects unplayable tiles', () => {
  const tiles = [...allHotelsTiles(), { row: 8, col: 1, location: 0 } as Tile];
  const err = assertThrows(
    () => playTileValidation(0, { row: 8, col: 1 }, tiles),
    GameError,
    "2I can't be played: all hotels are already on the board",
  );
  assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
});
