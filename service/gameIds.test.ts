import { assertEquals, assertMatch } from '@std/assert';

import { newGameId } from './gameIds.ts';
import { adjectives, nouns } from './gameIdWords.ts';

Deno.test('newGameId - adjective-noun-number, safe in a URL', () => {
  for (let i = 0; i < 100; i++) {
    assertMatch(newGameId(), /^[a-z0-9]+(-[a-z0-9]+)*-[1-9][0-9]$/);
  }
});

Deno.test('game id words - each one makes a usable slug', () => {
  for (const word of [...adjectives, ...nouns]) {
    assertEquals(/[a-z0-9]/i.test(word), true, `"${word}" has no letters or digits`);
  }
});
