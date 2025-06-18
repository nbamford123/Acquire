import { assertEquals } from 'jsr:@std/assert';
import { initializePlayer } from './playerOperations.ts';
import { INITIAL_PLAYER_MONEY } from '../../shared/types/gameConfig.ts';
import type { Player } from '@/types/index.ts';

Deno.test('initializePlayer', async (t) => {
  await t.step('creates player with correct default values', () => {
    const playerName = 'Alice';
    const result = initializePlayer(playerName);

    const expected: Player = {
      id: -1,
      name: 'Alice',
      money: INITIAL_PLAYER_MONEY,
    };

    assertEquals(result, expected);
  });

  await t.step('creates player with correct name', () => {
    const playerName = 'Bob';
    const result = initializePlayer(playerName);

    assertEquals(result.name, 'Bob');
    assertEquals(result.id, -1);
    assertEquals(result.money, INITIAL_PLAYER_MONEY);
  });

  await t.step('creates player with initial money from config', () => {
    const playerName = 'Charlie';
    const result = initializePlayer(playerName);

    assertEquals(result.money, 3000); // INITIAL_PLAYER_MONEY value
    assertEquals(result.money, INITIAL_PLAYER_MONEY);
  });

  await t.step('handles empty string name', () => {
    const playerName = '';
    const result = initializePlayer(playerName);

    assertEquals(result.name, '');
    assertEquals(result.id, -1);
    assertEquals(result.money, INITIAL_PLAYER_MONEY);
  });

  await t.step('handles special characters in name', () => {
    const playerName = 'Player@123!';
    const result = initializePlayer(playerName);

    assertEquals(result.name, 'Player@123!');
    assertEquals(result.id, -1);
    assertEquals(result.money, INITIAL_PLAYER_MONEY);
  });

  await t.step('handles long name', () => {
    const playerName = 'VeryLongPlayerNameThatExceedsNormalLength';
    const result = initializePlayer(playerName);

    assertEquals(result.name, 'VeryLongPlayerNameThatExceedsNormalLength');
    assertEquals(result.id, -1);
    assertEquals(result.money, INITIAL_PLAYER_MONEY);
  });

  await t.step('creates new object each time (no mutation)', () => {
    const playerName1 = 'Player1';
    const playerName2 = 'Player2';

    const player1 = initializePlayer(playerName1);
    const player2 = initializePlayer(playerName2);

    // Players should be different objects
    assertEquals(player1 !== player2, true);

    // But have the same structure except for name
    assertEquals(player1.id, player2.id);
    assertEquals(player1.money, player2.money);
    assertEquals(player1.name !== player2.name, true);
  });

  await t.step('does not include firstTile property initially', () => {
    const playerName = 'TestPlayer';
    const result = initializePlayer(playerName);

    // firstTile should be undefined (not included in the object)
    assertEquals(result.firstTile, undefined);
    assertEquals('firstTile' in result, false);
  });

  await t.step('creates player with correct type structure', () => {
    const playerName = 'TypeTest';
    const result = initializePlayer(playerName);

    // Verify all required properties exist
    assertEquals(typeof result.id, 'number');
    assertEquals(typeof result.name, 'string');
    assertEquals(typeof result.money, 'number');

    // Verify the object has exactly the expected properties
    const keys = Object.keys(result);
    assertEquals(keys.length, 3);
    assertEquals(keys.includes('id'), true);
    assertEquals(keys.includes('name'), true);
    assertEquals(keys.includes('money'), true);
  });
});
