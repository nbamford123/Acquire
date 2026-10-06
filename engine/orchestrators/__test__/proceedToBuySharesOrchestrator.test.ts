import { assertEquals } from '@std/assert';
import { proceedToBuySharesOrchestrator } from '../proceedToBuySharesOrchestrator.ts';
import { GamePhase } from '../../types/index.ts';

const makeHotel = (name: any, bankShares = 25) => ({
  name,
  shares: Array.from({ length: 25 }, (_, i) => ({ location: i < bankShares ? 'bank' : 0 })),
});

Deno.test('proceedToBuySharesOrchestrator allows buying when player has enough money', () => {
  const tiles = [
    { row: 0, col: 0, location: 'board', hotel: 'Worldwide' },
  ] as unknown as any[];

  const gameState = {
    gameId: 'g-buy',
    owner: 'o',
    currentPhase: GamePhase.PLAY_TILE,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [{ id: 0, name: 'P0', money: 1000 }, { id: 1, name: 'P1', money: 0 }],
    hotels: [makeHotel('Worldwide')],
    tiles,
  } as unknown as any;

  const [result, actions] = proceedToBuySharesOrchestrator(gameState);
  assertEquals(result.currentPhase, GamePhase.BUY_SHARES);
});

Deno.test('proceedToBuySharesOrchestrator advances turn when player cannot buy', () => {
  const tiles = [
    { row: 0, col: 0, location: 'board', hotel: 'Worldwide' },
    { row: 0, col: 1, location: 'bag' },
    // Hands away from the board so every tile is playable
    ...Array.from({ length: 5 }, (_, col) => ({ row: 8, col, location: 0 })),
    ...Array.from({ length: 6 }, (_, col) => ({ row: 7, col, location: 1 })),
  ] as unknown as any[];

  const gameState = {
    gameId: 'g-no-buy',
    owner: 'o',
    currentPhase: GamePhase.PLAY_TILE,
    currentTurn: 1,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [{ id: 0, name: 'P0', money: 100 }, { id: 1, name: 'P1', money: 0 }],
    hotels: [makeHotel('Worldwide')],
    tiles,
  } as unknown as any;

  const [result, actions] = proceedToBuySharesOrchestrator(gameState);
  // Should have advanced to next player and set phase to PLAY_TILE
  assertEquals(result.currentPlayer, 1);
  assertEquals(result.currentPhase, GamePhase.PLAY_TILE);
});
