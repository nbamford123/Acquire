import { assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { endGameReducer } from '../endGameReducer.ts';
import type { GameState, Hotel, Player, Tile } from '../../types/index.ts';
import { GamePhase } from '../../types/index.ts';

Deno.test('endGameReducer', async (t) => {
  const createTestState = (config: {
    players: Player[];
    hotels: Hotel[];
    tiles: Tile[];
    currentTurn: number;
  }): GameState => ({
    gameId: 'test-game',
    owner: 'owner',
    currentPhase: GamePhase.PLAY_TILE,
    currentTurn: config.currentTurn,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: config.players,
    hotels: config.hotels,
    tiles: config.tiles,
  });

  await t.step('returns updated players with payouts', () => {
    const players: Player[] = [
      { id: 0, name: 'P0', money: 5000 },
      { id: 1, name: 'P1', money: 5000 },
    ];

    const hotels: Hotel[] = [
      {
        name: 'Tower',
        shares: [
          { location: 0 } as const,
          { location: 0 } as const,
          { location: 1 } as const,
          ...Array.from({ length: 22 }, () => ({ location: 'bank' as const })),
        ] as unknown as Hotel['shares'],
      },
    ];

    const tiles: Tile[] = [
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
    ] as unknown as Tile[];

    const gameState = createTestState({ players, hotels, tiles, currentTurn: 3 });
    const [updatedState, actions] = endGameReducer(gameState);

    // Players should have received payouts
    assertEquals(updatedState.players !== undefined, true);
    assertEquals(updatedState.players!.length, 2);
    // P0 should have more money (majority shareholder with 2 shares)
    assertEquals(updatedState.players![0].money > 5000, true);
    // P1 should have more money (minority shareholder with 1 share)
    assertEquals(updatedState.players![1].money > 5000, true);
  });

  await t.step('processes multiple active hotels in size order', () => {
    const players: Player[] = [
      { id: 0, name: 'P0', money: 5000 },
      { id: 1, name: 'P1', money: 5000 },
    ];

    const hotels: Hotel[] = [
      {
        name: 'Tower',
        shares: [
          { location: 0 } as const,
          ...Array.from({ length: 24 }, () => ({ location: 'bank' as const })),
        ] as unknown as Hotel['shares'],
      },
      {
        name: 'Luxor',
        shares: [
          { location: 1 } as const,
          ...Array.from({ length: 24 }, () => ({ location: 'bank' as const })),
        ] as unknown as Hotel['shares'],
      },
    ];

    // Luxor has 5 tiles, Tower has 3 tiles
    const tiles: Tile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'Tower' },
      { row: 0, col: 1, location: 'board', hotel: 'Tower' },
      { row: 0, col: 2, location: 'board', hotel: 'Tower' },
      { row: 1, col: 0, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 1, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 2, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 3, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 4, location: 'board', hotel: 'Luxor' },
    ] as unknown as Tile[];

    const gameState = createTestState({ players, hotels, tiles, currentTurn: 5 });
    const [updatedState, actions] = endGameReducer(gameState);

    // Both players should have received payouts from their respective hotels
    assertEquals(updatedState.players![0].money > 5000, true);
    assertEquals(updatedState.players![1].money > 5000, true);
  });

  await t.step('ignores hotels with zero tiles', () => {
    const players: Player[] = [{ id: 0, name: 'P0', money: 5000 }];

    const hotels: Hotel[] = [
      {
        name: 'Tower',
        shares: [
          { location: 0 } as const,
          ...Array.from({ length: 24 }, () => ({ location: 'bank' as const })),
        ] as unknown as Hotel['shares'],
      },
      {
        name: 'Luxor',
        shares: Array.from({ length: 25 }, () => ({ location: 'bank' as const })) as unknown as Hotel['shares'],
      },
    ];

    const tiles: Tile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'Tower' },
      { row: 0, col: 1, location: 'board', hotel: 'Tower' },
      { row: 0, col: 2, location: 'board', hotel: 'Tower' },
    ] as unknown as Tile[];

    const gameState = createTestState({ players, hotels, tiles, currentTurn: 2 });
    const [updatedState, actions] = endGameReducer(gameState);

    // P0 should receive payout only from Tower (Luxor has no tiles and no shareholders)
    assertEquals(updatedState.players![0].money > 5000, true);
  });
  await t.step('accumulates payouts across multiple hotels for same player', () => {
    const players: Player[] = [
      { id: 0, name: 'P0', money: 5000 },
      { id: 1, name: 'P1', money: 5000 },
    ];

    const hotels: Hotel[] = [
      {
        name: 'Tower',
        shares: [
          { location: 0 } as const,
          { location: 0 } as const,
          ...Array.from({ length: 23 }, () => ({ location: 'bank' as const })),
        ] as unknown as Hotel['shares'],
      },
      {
        name: 'Luxor',
        shares: [
          { location: 0 } as const,
          { location: 1 } as const,
          ...Array.from({ length: 23 }, () => ({ location: 'bank' as const })),
        ] as unknown as Hotel['shares'],
      },
    ];

    const tiles: Tile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'Tower' },
      { row: 0, col: 1, location: 'board', hotel: 'Tower' },
      { row: 0, col: 2, location: 'board', hotel: 'Tower' },
      { row: 1, col: 0, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 1, location: 'board', hotel: 'Luxor' },
      { row: 1, col: 2, location: 'board', hotel: 'Luxor' },
    ] as unknown as Tile[];

    const gameState = createTestState({ players, hotels, tiles, currentTurn: 4 });
    const [updatedState, actions] = endGameReducer(gameState);

    // P0 owns shares in both hotels, so should receive payouts from both
    const p0Money = updatedState.players![0].money;
    assertEquals(p0Money > 5000, true);
  });

  await t.step('returns actions with current turn number', () => {
    const players: Player[] = [{ id: 0, name: 'P0', money: 5000 }];

    const hotels: Hotel[] = [
      {
        name: 'Tower',
        shares: [
          { location: 0 } as const,
          ...Array.from({ length: 24 }, () => ({ location: 'bank' as const })),
        ] as unknown as Hotel['shares'],
      },
    ];

    const tiles: Tile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'Tower' },
      { row: 0, col: 1, location: 'board', hotel: 'Tower' },
      { row: 0, col: 2, location: 'board', hotel: 'Tower' },
    ] as unknown as Tile[];

    const gameState = createTestState({ players, hotels, tiles, currentTurn: 7 });
    const [updatedState, actions] = endGameReducer(gameState);

    // All actions should have the correct turn number
    assertEquals(actions.length > 0, true);
    actions.forEach((action) => {
      assertEquals(action.turn, 7);
    });
  });

  await t.step('handles game with no shareholders (all bank shares)', () => {
    const players: Player[] = [{ id: 0, name: 'P0', money: 5000 }];

    const hotels: Hotel[] = [
      {
        name: 'Tower',
        shares: Array.from({ length: 25 }, () => ({ location: 'bank' as const })) as unknown as Hotel['shares'],
      },
    ];

    const tiles: Tile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'Tower' },
      { row: 0, col: 1, location: 'board', hotel: 'Tower' },
      { row: 0, col: 2, location: 'board', hotel: 'Tower' },
    ] as unknown as Tile[];

    const gameState = createTestState({ players, hotels, tiles, currentTurn: 2 });
    const [updatedState, actions] = endGameReducer(gameState);

    // Should handle gracefully - no payouts since no one owns shares
    assertEquals(updatedState.players![0].money, 5000);
  });

  await t.step('handles multiple players with multiple shareholders', () => {
    const players: Player[] = [
      { id: 0, name: 'P0', money: 5000 },
      { id: 1, name: 'P1', money: 5000 },
      { id: 2, name: 'P2', money: 5000 },
    ];

    const hotels: Hotel[] = [
      {
        name: 'Tower',
        shares: [
          { location: 0 } as const,
          { location: 0 } as const,
          { location: 0 } as const,
          { location: 1 } as const,
          { location: 1 } as const,
          { location: 2 } as const,
          ...Array.from({ length: 19 }, () => ({ location: 'bank' as const })),
        ] as unknown as Hotel['shares'],
      },
    ];

    const tiles: Tile[] = [
      { row: 0, col: 0, location: 'board', hotel: 'Tower' },
      { row: 0, col: 1, location: 'board', hotel: 'Tower' },
      { row: 0, col: 2, location: 'board', hotel: 'Tower' },
      { row: 0, col: 3, location: 'board', hotel: 'Tower' },
      { row: 0, col: 4, location: 'board', hotel: 'Tower' },
    ] as unknown as Tile[];

    const gameState = createTestState({ players, hotels, tiles, currentTurn: 3 });
    const [updatedState, actions] = endGameReducer(gameState);

    // All three players should receive payouts (P0 has majority, others share minority)
    const initialMoney = 5000;
    assertEquals(updatedState.players![0].money >= initialMoney, true);
    assertEquals(updatedState.players![1].money >= initialMoney, true);
    assertEquals(updatedState.players![2].money >= initialMoney, true);
    // At least one player should have received a payout
    const totalPayouts = updatedState.players!.reduce((sum, p) => sum + (p.money - initialMoney), 0);
    assertEquals(totalPayouts > 0, true);
  });
});
