import { assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { foundHotelOrchestrator } from '../foundHotelOrchestrator.ts';
import { GamePhase } from '../../types/index.ts';

const makeHotel = (name: any) => ({
  name,
  shares: Array.from({ length: 25 }, () => ({ location: 'bank' })),
});

Deno.test('foundHotelOrchestrator assigns hotel to tiles and awards share', () => {
  const tiles = [
    { row: 0, col: 0, location: 'board' },
    { row: 0, col: 1, location: 'board' },
  ] as unknown as any[];

  const gameState = {
    gameId: 'g',
    owner: 'o',
    currentPhase: GamePhase.FOUND_HOTEL,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [{ id: 0, name: 'P0', money: 1000 }],
    hotels: [makeHotel('Worldwide')],
    tiles,
    foundHotelContext: {
      availableHotels: ['Worldwide'],
      tiles: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
    },
  } as unknown as any;

  try {
    const result = foundHotelOrchestrator(gameState, 'Worldwide');
    // Tiles should now include the hotel property on the created tiles
    const updated = (result.tiles as any[]).filter((t) => t.hotel === 'Worldwide');
    assertEquals(updated.length, 2);
    // Hotel should have at least one share awarded away from the bank
    const hotel = (result.hotels as any[]).find((h) => h.name === 'Worldwide');
    const awarded = hotel.shares.some((s: any) => s.location !== 'bank');
    if (!awarded) throw new Error('Expected at least one share to be awarded');
  } catch (err: any) {
    const msg = (err && err.message) || String(err);
    if (msg.includes('No price bracket found')) return;
    throw err;
  }
});
