import { Hono } from 'hono';

import { setRoutes } from './routes.ts';
import { deleteGamesUpdatedBefore } from './dataLayer.ts';
import { seedTestGames } from './seed.ts';
import type { ServiceEnv } from './types.ts';

// Application setup
export const app = new Hono<ServiceEnv>();
setRoutes(app);

// Games nobody has touched in this long are deleted by the daily sweep
const INACTIVE_GAME_DAYS = 30;

// Deno Deploy only finds cron jobs registered at the top level, before the server starts
Deno.cron('Delete inactive games', '0 4 * * *', async () => {
  const cutoff = Date.now() - INACTIVE_GAME_DAYS * 24 * 60 * 60 * 1000;
  const deleted = await deleteGamesUpdatedBefore(cutoff);
  console.log(`🧹 Deleted ${deleted.length} inactive games`);
});

// Wipe KV and reload test games on each start (local development only)
if (Deno.env.get('SEED_TEST_GAMES') === 'true') {
  await seedTestGames();
}

// Start server
const port = parseInt(Deno.env.get('PORT') || '8000');
console.log(`🎲 Acquire Server starting on port ${port}`);

await Deno.serve({ port }, app.fetch);
export type AppEnv = {
  Variables: {
    user?: string;
    // add other custom context variables here
  };
};
