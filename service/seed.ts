import type { GameState } from '@acquire/engine/types';

import { deleteAllData, saveGameState } from './dataLayer.ts';

// Local development only: wipes the database, then loads the games in __test-data__
export async function seedTestGames() {
  await deleteAllData();
  const testDataDir = `${import.meta.dirname}/__test-data__`;
  for await (const file of Deno.readDir(testDataDir)) {
    if (file.isFile && file.name.endsWith('.json')) {
      const game: GameState = JSON.parse(
        await Deno.readTextFile(`${testDataDir}/${file.name}`),
      );
      await saveGameState(game);
      console.log(`🌱 Seeded test game ${game.gameId} from ${file.name}`);
    }
  }
}
