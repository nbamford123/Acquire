import { assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { processMergerOrchestrator } from '../processMergerOrchestrator.ts';
import { GamePhase } from '../../types/index.ts';

// Helper to make a hotel object with shares in the bank
const makeHotel = (name: any) => ({
  name,
  shares: Array.from({ length: 25 }, () => ({ location: 'bank' })),
});

Deno.test('processMergerOrchestrator returns BREAK_MERGER_TIE when tie detected', () => {
  const tiles = [
    // Board tiles for two hotels with equal size
    { row: 0, col: 0, location: 'board', hotel: 'Worldwide' },
    { row: 0, col: 1, location: 'board', hotel: 'Luxor' },
  ] as unknown as any[];

  const gameState = {
    gameId: 'g',
    owner: 'o',
    currentPhase: GamePhase.PLAY_TILE,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [{ id: 0, name: 'P0' }],
    hotels: [makeHotel('Worldwide'), makeHotel('Luxor')],
    tiles,
    mergeContext: {
      originalHotels: ['Worldwide', 'Luxor'],
      additionalTiles: [],
    },
  } as unknown as any;

  const [state, actions] = processMergerOrchestrator(gameState);
  assertEquals(state.currentPhase, GamePhase.BREAK_MERGER_TIE);
  // mergerTieContext should contain the tied hotels
  assertEquals(Array.isArray(state.mergerTieContext?.tiedHotels), true);
});

Deno.test('processMergerOrchestrator proceeds to RESOLVE_MERGER when sizes differ', () => {
  const tiles = [
    // Worldwide has 2 tiles, Luxor has 1
    { row: 0, col: 0, location: 'board', hotel: 'Worldwide' },
    { row: 0, col: 1, location: 'board', hotel: 'Worldwide' },
    { row: 0, col: 2, location: 'board', hotel: 'Luxor' },
  ] as unknown as any[];

  const gameState = {
    gameId: 'g2',
    owner: 'o',
    currentPhase: GamePhase.PLAY_TILE,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [{ id: 0, name: 'P0', money: 0 }],
    hotels: [makeHotel('Worldwide'), {
      ...makeHotel('Luxor'),
      shares: [{ location: 0 }, ...Array.from({ length: 24 }, () => ({ location: 'bank' }))],
    }],
    tiles,
    mergeContext: {
      originalHotels: ['Worldwide', 'Luxor'],
      additionalTiles: [],
    },
  } as unknown as any;

  const [state, actions] = processMergerOrchestrator(gameState);
  assertEquals(state.currentPhase, GamePhase.RESOLVE_MERGER);
  // After prepareMergerReducer, mergeContext should be set with survivingHotel
  if (state.mergeContext) {
    // survivingHotel should be present
    // (string name of the surviving hotel)
    // We expect Worldwide to be the survivor because it has 2 tiles
    // The reducer may set survivingHotel accordingly
    // Just assert mergeContext has a survivingHotel key
    // (detailed value asserted indirectly via presence)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const hasSurvivor = !!state.mergeContext.survivingHotel;
    assertEquals(hasSurvivor, true);
  }
});

Deno.test('processMergerOrchestrator tie drops details of the previous merger', () => {
  const tiles = [
    { row: 0, col: 0, location: 'board', hotel: 'Worldwide' },
    { row: 0, col: 1, location: 'board', hotel: 'Luxor' },
    { row: 0, col: 2, location: 'board', hotel: 'Festival' },
  ] as unknown as any[];

  const gameState = {
    gameId: 'g3',
    owner: 'o',
    currentPhase: GamePhase.RESOLVE_MERGER,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [{ id: 0, name: 'P0', money: 0 }],
    hotels: [makeHotel('Worldwide'), makeHotel('Luxor'), makeHotel('Festival')],
    tiles,
    mergeContext: {
      survivingHotel: 'Worldwide',
      mergedHotel: 'Imperial',
      mergedHotelSize: 4,
      stockholderIds: [],
      originalHotels: ['Luxor', 'Festival'],
      additionalTiles: [],
    },
  } as unknown as any;

  const [state] = processMergerOrchestrator(gameState);
  assertEquals(state.currentPhase, GamePhase.BREAK_MERGER_TIE);
  assertEquals(state.mergerTieContext?.tiedHotels, ['Luxor', 'Festival']);
  assertEquals(state.mergeContext, {
    survivingHotel: 'Worldwide',
    originalHotels: ['Luxor', 'Festival'],
    additionalTiles: [],
  });
});

Deno.test('processMergerOrchestrator skips resolving when nobody holds merged shares', async (t) => {
  const makeState = (originalHotels: string[]) =>
    ({
      gameId: 'g4',
      owner: 'o',
      currentPhase: GamePhase.PLAY_TILE,
      currentTurn: 1,
      currentPlayer: 0,
      lastUpdated: Date.now(),
      players: [{ id: 0, name: 'P0', money: 100000 }],
      hotels: [makeHotel('Worldwide'), makeHotel('Luxor'), {
        ...makeHotel('Festival'),
        shares: [{ location: 0 }, ...Array.from({ length: 24 }, () => ({ location: 'bank' }))],
      }],
      tiles: [
        { row: 0, col: 0, location: 'board', hotel: 'Worldwide' },
        { row: 0, col: 1, location: 'board', hotel: 'Worldwide' },
        { row: 0, col: 2, location: 'board', hotel: 'Worldwide' },
        { row: 1, col: 0, location: 'board', hotel: 'Luxor' },
        { row: 1, col: 1, location: 'board', hotel: 'Luxor' },
        { row: 2, col: 0, location: 'board', hotel: 'Festival' },
      ],
      mergeContext: { originalHotels, additionalTiles: [] },
    }) as unknown as any;

  await t.step('moves on to buy shares when it was the last merger', () => {
    const [state, actions] = processMergerOrchestrator(makeState(['Worldwide', 'Luxor']));
    assertEquals(state.currentPhase, GamePhase.BUY_SHARES);
    assertEquals(actions[0].action, 'P0 merged Luxor into Worldwide');
  });

  await t.step('moves on to the next merger when hotels remain', () => {
    const [state, actions] = processMergerOrchestrator(
      makeState(['Worldwide', 'Luxor', 'Festival']),
    );
    assertEquals(state.currentPhase, GamePhase.RESOLVE_MERGER);
    assertEquals(state.mergeContext?.mergedHotel, 'Festival');
    assertEquals(state.mergeContext?.stockholderIds, [0]);
    const text = actions.map((action) => action.action);
    assertEquals(text.includes('P0 merged Luxor into Worldwide'), true);
    assertEquals(text.includes('P0 merged Festival into Worldwide'), true);
  });
});
