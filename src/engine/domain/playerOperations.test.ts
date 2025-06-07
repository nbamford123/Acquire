import { assertEquals } from 'jsr:@std/assert';
import { initializePlayer } from './playerOperations.ts';
import { INITIAL_PLAYER_MONEY } from '@/engine/config/gameConfig.ts';

Deno.test('initializePlayer', async (t) => {
  await t.step('creates player with correct default properties', () => {
    const player = initializePlayer('TestPlayer');

    assertEquals(player.id, -1);
    assertEquals(player.name, 'TestPlayer');
    assertEquals(player.money, INITIAL_PLAYER_MONEY);
    assertEquals(player.shares, {});
    assertEquals(player.tiles, []);
    assertEquals(player.firstTile, undefined);
  });

  await t.step('handles empty player name', () => {
    const player = initializePlayer('');

    assertEquals(player.name, '');
    assertEquals(player.money, INITIAL_PLAYER_MONEY);
    assertEquals(player.shares, {});
    assertEquals(player.tiles, []);
  });

  await t.step('handles player name with special characters', () => {
    const specialName = 'Player@123!';
    const player = initializePlayer(specialName);

    assertEquals(player.name, specialName);
    assertEquals(player.money, INITIAL_PLAYER_MONEY);
  });

  await t.step('handles very long player name', () => {
    const longName = 'A'.repeat(100);
    const player = initializePlayer(longName);

    assertEquals(player.name, longName);
    assertEquals(player.money, INITIAL_PLAYER_MONEY);
  });

  await t.step('creates independent player objects', () => {
    const player1 = initializePlayer('Player1');
    const player2 = initializePlayer('Player2');

    // Verify they are different objects
    assertEquals(player1 === player2, false);
    assertEquals(player1.name, 'Player1');
    assertEquals(player2.name, 'Player2');

    // Verify shares objects are independent
    assertEquals(player1.shares === player2.shares, false);

    // Verify tiles arrays are independent
    assertEquals(player1.tiles === player2.tiles, false);
  });

  await t.step('initializes with correct money amount from config', () => {
    const player = initializePlayer('TestPlayer');

    // Verify it uses the constant from config
    assertEquals(player.money, 3000); // INITIAL_PLAYER_MONEY value
    assertEquals(player.money, INITIAL_PLAYER_MONEY);
  });

  await t.step('initializes shares as empty object', () => {
    const player = initializePlayer('TestPlayer');

    assertEquals(Object.keys(player.shares).length, 0);
    assertEquals(typeof player.shares, 'object');
    assertEquals(player.shares.constructor, Object);
  });

  await t.step('initializes tiles as empty array', () => {
    const player = initializePlayer('TestPlayer');

    assertEquals(player.tiles.length, 0);
    assertEquals(Array.isArray(player.tiles), true);
  });

  await t.step('sets id to -1 by default', () => {
    const player = initializePlayer('TestPlayer');

    assertEquals(player.id, -1);
    assertEquals(typeof player.id, 'number');
  });

  await t.step('handles unicode characters in name', () => {
    const unicodeName = '玩家🎮';
    const player = initializePlayer(unicodeName);

    assertEquals(player.name, unicodeName);
    assertEquals(player.money, INITIAL_PLAYER_MONEY);
  });

  await t.step('preserves exact name string', () => {
    const nameWithSpaces = '  Player Name  ';
    const player = initializePlayer(nameWithSpaces);

    assertEquals(player.name, nameWithSpaces); // Should preserve spaces
  });
});
