import { assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { advanceTurnOrchestrator } from '../advanceTurnOrchestrator.ts';
import { GamePhase } from '../../types/index.ts';

Deno.test('advanceTurnOrchestrator advances player and keeps turn count', () => {
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
    currentPhase: GamePhase.PLAY_TILE,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players,
    hotels: [],
    tiles,
  } as unknown as any;

  const result = advanceTurnOrchestrator(baseState);
  // Next player should be 1
  assertEquals(result.currentPlayer, 1);
  // Turn should remain 1 because nextPlayerId !== 0
  assertEquals(result.currentTurn, 1);
  // Phase should be set to PLAY_TILE
  assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
});
