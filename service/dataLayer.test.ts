import { assertEquals } from '@std/assert';

import { initializeGame } from '@acquire/engine/core';
import type { PlayerAction } from '@acquire/engine/types';
import {
  createGame,
  deleteGamesUpdatedBefore,
  getAllGames,
  getGameEntry,
  getPlayerActions,
  saveGameState,
  saveMove,
} from './dataLayer.ts';

const action = (text: string): PlayerAction => ({ turn: 1, action: text });

Deno.test('saveMove saves the state and its actions together', async () => {
  const game = initializeGame('save-move', 'nate');
  await saveGameState(game);
  const { versionstamp } = await getGameEntry(game.gameId);

  const saved = await saveMove({ ...game, lastUpdated: game.lastUpdated + 1 }, versionstamp!, 0, [
    action('nate did a thing'),
    action('then another'),
  ]);
  assertEquals(saved, true);
  assertEquals((await getGameEntry(game.gameId)).value?.lastUpdated, game.lastUpdated + 1);
  assertEquals((await getPlayerActions(game.gameId)).map((a) => a.action), [
    'nate did a thing',
    'then another',
  ]);
});

Deno.test('saveMove rejects a move made against an old state', async () => {
  const game = initializeGame('stale-move', 'nate');
  await saveGameState(game);
  const { versionstamp } = await getGameEntry(game.gameId);

  // Another move lands first
  assertEquals(
    await saveMove({ ...game, lastUpdated: game.lastUpdated + 1 }, versionstamp!, 0, [
      action('first'),
    ]),
    true,
  );
  assertEquals(
    await saveMove({ ...game, lastUpdated: game.lastUpdated + 2 }, versionstamp!, 0, [
      action('second'),
    ]),
    false,
  );
  assertEquals((await getGameEntry(game.gameId)).value?.lastUpdated, game.lastUpdated + 1);
  assertEquals((await getPlayerActions(game.gameId)).map((a) => a.action), ['first']);
});

Deno.test('deleteGamesUpdatedBefore deletes only inactive games and their actions', async () => {
  const old = { ...initializeGame('old-game', 'nate'), lastUpdated: 1000 };
  const recent = initializeGame('recent-game', 'nate');
  await saveGameState(old);
  await saveGameState(recent);
  await saveMove(old, (await getGameEntry(old.gameId)).versionstamp!, 0, [action('old move')]);

  assertEquals(await deleteGamesUpdatedBefore(2000), ['old-game']);
  const remaining = (await getAllGames()).map((game) => game.gameId);
  assertEquals(remaining.includes('old-game'), false);
  assertEquals(remaining.includes('recent-game'), true);
  assertEquals(await getPlayerActions(old.gameId), []);
});

Deno.test("createGame doesn't overwrite a game with the same id", async () => {
  const first = initializeGame('taken-id-10', 'nate');
  assertEquals(await createGame(first), true);
  assertEquals(await createGame(initializeGame('taken-id-10', 'alice')), false);
  assertEquals((await getGameEntry('taken-id-10')).value?.owner, 'nate');
});
