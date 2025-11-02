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
  ] as unknown as any[];

  const baseState = {
    gameId: 'g',
    owner: 'o',
    currentPhase: GamePhase.BUY_SHARES,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players,
    hotels: [],
    tiles,
  } as unknown as any;

  // Provide an empty shares mapping; reducer should be able to handle this
  const result = buySharesOrchestrator(baseState, {} as any);
  // After buying shares the turn advances to next player
  assertEquals(result.currentPlayer, 1);
});
