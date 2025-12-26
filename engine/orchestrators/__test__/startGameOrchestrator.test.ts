import { assertEquals, assertExists } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { startGameOrchestrator } from '../startGameOrchestrator.ts';
import { GamePhase } from '../../types/index.ts';

Deno.test('startGameOrchestrator sets play phase and initializes player/turn', () => {
  const tiles = [
    { row: 0, col: 0, location: 'bag' },
    { row: 0, col: 1, location: 'bag' },
    { row: 0, col: 2, location: 'bag' },
    { row: 0, col: 3, location: 'bag' },
    { row: 0, col: 4, location: 'bag' },
    { row: 0, col: 5, location: 'bag' },
    { row: 0, col: 6, location: 'bag' },
    { row: 0, col: 7, location: 'bag' },
    { row: 0, col: 8, location: 'bag' },
    { row: 0, col: 9, location: 'bag' },
    { row: 0, col: 10, location: 'bag' },
    { row: 0, col: 11, location: 'bag' },
  ] as unknown as any[];
  const players = [
    { name: 'Alice' },
    { name: 'Bob' },
  ] as unknown as any[];

  const baseState = {
    gameId: 'g',
    owner: 'o',
    currentPhase: GamePhase.WAITING_FOR_PLAYERS,
    currentTurn: 0,
    currentPlayer: -1,
    lastUpdated: Date.now(),
    players,
    hotels: [],
    tiles,
  } as unknown as any;

  const [result, actions] = startGameOrchestrator(baseState);
  assertExists(result);
  assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
  assertEquals(result.currentPlayer, 0);
  assertEquals(result.currentTurn, 1);
  // players should be set by the reducer
  assertExists(result.players);
});
