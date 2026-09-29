import { assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { buySharesOrchestrator } from '../buySharesOrchestrator.ts';
import { GamePhase } from '../../types/index.ts';

Deno.test('buySharesOrchestrator applies buySharesReducer then advances turn', () => {
  const players = [
    { id: 0, name: 'P0' },
    { id: 1, name: 'P1' },
  ] as unknown as any[];

  const tiles = [
    { row: 0, col: 0, location: 'bag' },
    { row: 0, col: 1, location: 'bag' },
    { row: 0, col: 2, location: 'bag' },
    // Hands away from the board so every tile is playable
    ...Array.from({ length: 5 }, (_, col) => ({ row: 8, col, location: 0 })),
    ...Array.from({ length: 6 }, (_, col) => ({ row: 7, col, location: 1 })),
  ] as unknown as any[];

  const baseState = {
    gameId: 'g',
    owner: 'o',
    currentPhase: GamePhase.BUY_SHARES,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players,
    hotels: [
      { name: 'Tower', shares: Array.from({ length: 25 }, () => ({ location: 'bank' })) },
      { name: 'Luxor', shares: Array.from({ length: 25 }, () => ({ location: 'bank' })) },
    ],
    tiles,
  } as unknown as any;

  // Provide an empty shares mapping; reducer should be able to handle this
  const [result, actions] = buySharesOrchestrator(baseState, {
    type: 'BUY_SHARES',
    payload: {
      player: 'P0',
      shares: {},
    },
  } as any);
  // After buying shares the turn advances to next player
  assertEquals(result.currentPlayer, 1);
});
