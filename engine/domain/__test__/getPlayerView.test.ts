import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { getPlayerView } from '../../utils/getPlayerView.ts';
import { GamePhase } from '../../types/index.ts';

Deno.test('getPlayerView basic behavior', () => {
  const gameState: any = {
    gameId: 'g1',
    owner: 'owner',
    currentPhase: GamePhase.PLAY_TILE,
    currentTurn: 0,
    currentPlayer: 0,
    lastUpdated: Date.now(),
    players: [
      { id: 0, name: 'Alice', money: 5 },
      { id: 1, name: 'Bob', money: 2 },
    ],
    hotels: [
      { name: 'Worldwide', shares: [{ location: 'bank' }, { location: 0 }] },
    ],
    tiles: [
      { row: 0, col: 0, location: 0 },
      { row: 0, col: 1, location: 'board' as any },
    ],
  };

  const view = getPlayerView('Alice', gameState);
  assertEquals(view.playerId, 0);
  assertEquals(view.money, 5);
  assertEquals(view.tiles.length, 1);
  // hotels mapping should include Worldwide with shares count
  assertEquals(typeof view.hotels.Worldwide.shares, 'number');
});

Deno.test('getPlayerView throws for unknown player', () => {
  const gameState: any = {
    players: [{ id: 0, name: 'Alice', money: 0 }],
    tiles: [],
    hotels: [],
    gameId: 'g',
    owner: '',
    currentPhase: GamePhase.PLAY_TILE,
    currentTurn: 0,
    currentPlayer: 0,
    lastUpdated: 0,
  };
  assertThrows(() => getPlayerView('Bob', gameState));
});
