import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { addPlayerValidation } from '../../domain/addPlayerValidation.ts';
import { startGameValidation } from '../../domain/startGameValidation.ts';
import { playTileValidation } from '../../domain/playTileValidation.ts';
import { GameError, GameErrorCodes } from '../../types/index.ts';

Deno.test('validations - addPlayerValidation and startGameValidation and playTileValidation', async (t) => {
  await t.step('addPlayerValidation throws when max players reached', () => {
    const players = Array.from({ length: 6 }, (_, i) => ({ name: `P${i}` } as any));
    const fn = () => addPlayerValidation('New', players as any);
    const err = assertThrows(fn, GameError, 'Game already has maximum of 6 players');
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('addPlayerValidation throws for empty name', () => {
    const players: any[] = [];
    const err = assertThrows(
      () => addPlayerValidation('', players),
      GameError,
      'Player name cannot be empty',
    );
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('startGameValidation throws when too few players', () => {
    const players: any[] = [{ name: 'A' }];
    const err = assertThrows(
      () => startGameValidation(players),
      GameError,
      "Can't start game without minimum of 2 players",
    );
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });

  await t.step('playTileValidation throws for invalid tile', () => {
    const tiles = [{ row: 0, col: 0, location: 'bag' } as any];
    const err = assertThrows(
      () => playTileValidation(1, { row: 0, col: 0 }, tiles),
      GameError,
      'Invalid or not player tile',
    );
    assertEquals(err.code, GameErrorCodes.GAME_INVALID_ACTION);
  });
});
