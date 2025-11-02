import { assertThrows } from 'jsr:@std/assert';
import { addPlayerValidation } from '../../domain/addPlayerValidation.ts';
import { MAX_PLAYERS, RESERVED_NAMES } from '../../types/index.ts';
import { GameError, GameErrorCodes } from '../../types/index.ts';

Deno.test('addPlayerValidation - extra branches', async (t) => {
  await t.step('throws for reserved names', () => {
    const players: any[] = [];
    const name = RESERVED_NAMES[0];
    const err = assertThrows(() => addPlayerValidation(name as any, players), GameError);
    if (err instanceof GameError) {
      if (err.code !== GameErrorCodes.GAME_INVALID_ACTION) throw err;
    }
  });

  await t.step('throws for name longer than 20 chars', () => {
    const players: any[] = [];
    const name = 'a'.repeat(21);
    const err = assertThrows(() => addPlayerValidation(name, players), GameError);
    if (err instanceof GameError) {
      if (err.code !== GameErrorCodes.GAME_INVALID_ACTION) throw err;
    }
  });

  await t.step('throws for duplicate name', () => {
    const players: any[] = [{ name: 'Alice' }];
    const err = assertThrows(() => addPlayerValidation('Alice', players as any), GameError);
    if (err instanceof GameError) {
      if (err.code !== GameErrorCodes.GAME_INVALID_ACTION) throw err;
    }
  });

  await t.step('throws when max players reached (edge using MAX_PLAYERS)', () => {
    // already covered in validation.test, but exercise with MAX_PLAYERS
    const players = Array.from({ length: MAX_PLAYERS }, (_, i) => ({ name: `P${i}` }));
    const err = assertThrows(() => addPlayerValidation('NewPlayer', players as any), GameError);
    if (err instanceof GameError) {
      if (err.code !== GameErrorCodes.GAME_INVALID_ACTION) throw err;
    }
  });
});
