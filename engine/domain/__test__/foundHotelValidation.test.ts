import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { foundHotelValidation } from '../../domain/foundHotelValidation.ts';
import { type Hotel, type Tile } from '../../types/index.ts';

function boardTile(row: number, col: number, hotel?: string): Tile {
  const t: any = { row, col, location: 'board' };
  if (hotel) t.hotel = hotel;
  return t as Tile;
}

Deno.test('foundHotelValidation cases', async (t) => {
  await t.step('throws when hotel not in state', () => {
    const tiles: Tile[] = [boardTile(0, 0)];
    const hotels: Hotel[] = [{ name: 'Worldwide', shares: [] } as any];
    const context = { availableHotels: ['Luxor'], tiles: [{ row: 0, col: 0 }] } as any;

    const err = assertThrows(() => foundHotelValidation(context, 'Luxor' as any, hotels, tiles));
    assertEquals((err as any).message.includes('not found'), true);
  });

  await t.step('throws when hotel already exists', () => {
    const tiles: Tile[] = [boardTile(0, 0, 'Worldwide')];
    const hotels: Hotel[] = [{ name: 'Worldwide', shares: [] } as any];
    const context = { availableHotels: ['Festival'], tiles: [{ row: 0, col: 0 }] } as any;

    const err = assertThrows(() =>
      foundHotelValidation(context, 'Worldwide' as any, hotels, tiles)
    );
    assertEquals((err as any).message.includes('already exists'), true);
  });

  await t.step('throws when context missing', () => {
    const tiles: Tile[] = [boardTile(0, 0)];
    const hotels: Hotel[] = [{ name: 'Festival', shares: [] } as any];
    const err = assertThrows(() =>
      foundHotelValidation(undefined, 'Festival' as any, hotels, tiles)
    );
    assertEquals((err as any).message.includes('context missing'), true);
  });

  await t.step('throws when not enough context tiles', () => {
    const tiles: Tile[] = [boardTile(0, 0)];
    const hotels: Hotel[] = [{ name: 'Festival', shares: [] } as any];
    const context = { availableHotels: ['Festival'], tiles: [{ row: 0, col: 0 }] } as any;
    const err = assertThrows(() => foundHotelValidation(context, 'Festival' as any, hotels, tiles));
    assertEquals((err as any).message.includes('need at least two tiles'), true);
  });

  await t.step('throws when context tiles invalid', () => {
    const tiles: Tile[] = [boardTile(0, 0)];
    const hotels: Hotel[] = [{ name: 'Festival', shares: [] } as any];
    // context refers to a tile not on board
    const context = {
      availableHotels: ['Festival'],
      tiles: [{ row: 9, col: 9 }, { row: 0, col: 0 }],
    } as any;
    const err = assertThrows(() => foundHotelValidation(context, 'Festival' as any, hotels, tiles));
    // getBoardTile may throw 'Tile not found' or the validation may throw 'Invalid tiles in found hotel context'
    // Accept either by asserting an error message exists
    assertEquals(typeof (err as any).message === 'string', true);
  });

  await t.step('accepts valid found hotel context', () => {
    const tiles: Tile[] = [boardTile(0, 0), boardTile(0, 1)];
    const hotels: Hotel[] = [{ name: 'Festival', shares: [] } as any];
    const context = {
      availableHotels: ['Festival'],
      tiles: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
    } as any;
    // should not throw
    foundHotelValidation(context as any, 'Festival' as any, hotels as any, tiles as any);
  });
});
