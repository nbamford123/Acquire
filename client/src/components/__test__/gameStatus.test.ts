import { assertEquals } from '@std/assert';

import { GamePhase, type PlayerView } from '@acquire/engine/types';
import { gameStatus } from '../gameStatus.ts';
import { makePlayerView } from './fixtures.ts';

Deno.test('gameStatus - says what the player who needs to act is doing', async (t) => {
  await t.step('on your turn', () => {
    assertEquals(gameStatus(makePlayerView()), 'Your turn: play a tile');
    assertEquals(
      gameStatus(makePlayerView({ currentPhase: GamePhase.FOUND_HOTEL })),
      'Your turn: found a hotel',
    );
    assertEquals(
      gameStatus(makePlayerView({ currentPhase: GamePhase.BREAK_MERGER_TIE })),
      'Your turn: break the merger tie',
    );
  });

  await t.step("on someone else's turn", () => {
    assertEquals(
      gameStatus(makePlayerView({ currentPlayer: 1, currentPhase: GamePhase.BUY_SHARES })),
      'Waiting for alice to buy shares',
    );
  });

  await t.step('while a merger resolves, each stockholder in turn', () => {
    const merger: Partial<PlayerView> = {
      currentPhase: GamePhase.RESOLVE_MERGER,
      mergeContext: {
        survivingHotel: 'Tower',
        mergedHotel: 'Luxor',
        stockholderIds: [1, 0],
        originalHotels: [],
        additionalTiles: [],
      },
    };
    assertEquals(
      gameStatus(makePlayerView({ ...merger, pendingMergePlayer: 1 })),
      'Waiting for alice to sell, trade, or keep their Luxor shares',
    );
    assertEquals(
      gameStatus(makePlayerView({ ...merger, currentPlayer: 1, pendingMergePlayer: 0 })),
      'Your turn: sell, trade, or keep your Luxor shares',
    );
  });

  await t.step('before and after the game', () => {
    assertEquals(
      gameStatus(makePlayerView({ currentPhase: GamePhase.WAITING_FOR_PLAYERS })),
      'Waiting for the game to start',
    );
    assertEquals(
      gameStatus(makePlayerView({
        currentPhase: GamePhase.GAME_OVER,
        finalStandings: [{ name: 'nate', money: 100 }],
      })),
      'Game over',
    );
  });
});
