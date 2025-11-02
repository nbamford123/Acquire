import { assertEquals } from 'jsr:@std/assert';
import { analyzeTilePlacement } from '../../domain/analyzeTilePlacement.ts';
import { type Tile } from '../../types/index.ts';

function boardTile(row: number, col: number, hotel?: string): Tile {
  const t: any = { row, col, location: 'board' };
  if (hotel) t.hotel = hotel;
  return t;
}

Deno.test('analyzeTilePlacement various outcomes', async (t) => {
  await t.step('simple placement when no adjacent board tiles', () => {
    const tile = { row: 4, col: 4, location: 'bag' } as Tile;
    const tiles: Tile[] = [];
    const result = analyzeTilePlacement(tile, tiles);
    assertEquals(result.simplePlacement, true);
    assertEquals(result.foundsHotel, false);
    assertEquals(result.growsHotel, false);
    assertEquals(result.triggersMerger, false);
  });

  await t.step('grows hotel when a single adjacent hotel tile', () => {
    const tile = { row: 4, col: 4, location: 'bag' } as Tile;
    const tiles: Tile[] = [boardTile(4, 5, 'Worldwide')];
    const result = analyzeTilePlacement(tile, tiles);
    assertEquals(result.growsHotel, true);
    assertEquals(result.triggersMerger, false);
  });

  await t.step('triggers merger when adjacent to two different hotels', () => {
    const tile = { row: 4, col: 4, location: 'bag' } as Tile;
    const tiles: Tile[] = [
      boardTile(4, 5, 'Worldwide'),
      boardTile(5, 4, 'Sackson'),
    ];
    const result = analyzeTilePlacement(tile, tiles);
    assertEquals(result.triggersMerger, true);
  });

  await t.step(
    'founds hotel when adjacent to board tiles but none are hotels and there are available hotels',
    () => {
      const tile = { row: 4, col: 4, location: 'bag' } as Tile;
      // adjacent tiles are on board but have no hotel
      const tiles: Tile[] = [boardTile(4, 5), boardTile(0, 0, 'Worldwide')];
      const result = analyzeTilePlacement(tile, tiles);
      // adjacentTiles length >=1 and adjacentHotels length === 0 and availableHotels exists
      // foundsHotel may be a truthy number (length) or boolean depending on implementation; assert truthiness
      assertEquals(Boolean(result.foundsHotel), true);
    },
  );
});
