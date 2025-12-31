import type { Context, Hono } from 'hono';
import { serveStatic } from 'hono/deno';
import { setCookie } from 'hono/cookie';

import { initializeGame, processAction } from '@acquire/engine/core';
import { getPlayerView } from '@acquire/engine/utils';
import type { GameAction, GameInfo, GameState, PlayerAction } from '@acquire/engine/types';

import { createToken, validateUser } from './auth.ts';
import { requireAuth } from './middleware.ts';
import type { ServiceEnv } from './types.ts';

// Simple in-memory store for demo - you'll want to use KV or external DB
const gameStates = new Map<string, GameState>();
const playerActions = new Map<string, PlayerAction[]>();

// Load test games
// TODO(me): remove before production
// const testDataDir = 'service/__test-data__';
// for (const file of Deno.readDirSync(testDataDir)) {
//   if (file.isFile && file.name.endsWith('.json')) {
//     const gameFile = Deno.readTextFileSync(`${testDataDir}/${file.name}`);
//     const game = JSON.parse(gameFile);
//     gameStates.set(game.gameId, game);
//   }
// }

// Only force https when in production
const isProduction = Deno.env.get('ENV') === 'production';

const uid = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const parseJsonBody = async (ctx: Context) => {
  try {
    return await ctx.req.json();
  } catch {
    throw new Error('Invalid JSON in request body');
  }
};
export const setRoutes = (app: Hono<ServiceEnv>) => {
  // Health check
  app.get('/health', (ctx) => {
    return ctx.json({ message: 'Acquire Server is running!' });
  });

  // login
  app.post('/api/login', async (ctx) => {
    try {
      const bodyJson = await parseJsonBody(ctx);
      const { email } = bodyJson as { email?: string };
      const user = validateUser(email || '');
      if (!email || user === null) {
        return ctx.json({ error: 'Invalid login' }, 403);
      }
      // create jwt token and add it to cookie
      const token = await createToken(email);
      setCookie(ctx, 'auth', token, {
        httpOnly: true,
        secure: isProduction, // HTTPS only
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 365, // 1 year in milliseconds
      });
      return ctx.json({ success: true, user });
    } catch (error) {
      return ctx.json({
        error: (error instanceof Error) ? error.message : String(error),
      }, 400);
    }
  });
  // Create game
  app.post('/api/games', requireAuth, (ctx) => {
    try {
      const user = ctx.get('user') || '';

      const gameId = uid();
      const game = initializeGame(gameId, user);
      gameStates.set(gameId, game);
      return ctx.json({ gameId: gameId }, 201);
    } catch (error) {
      return ctx.json({
        error: (error instanceof Error) ? error.message : String(error),
      }, 400);
    }
  });
  // Delete game
  app.delete('/api/games/:id', requireAuth, async (ctx) => {
    const gameId = ctx.req.param('id') || '';
    const game = gameStates.get(gameId);
    // TODO(me): only owner should be able to delete game
    if (!game) {
      return ctx.json({ error: 'Game not found' }, 404);
    }
    gameStates.delete(gameId);
    await Promise.resolve(); // Simulate async operation
    return ctx.body(null, 204);
  });
  // Save game
  // TODO(me): temporary - remove before production
  app.get('/api/save/:id', requireAuth, (ctx) => {
    const gameId = ctx.req.param('id') || '';
    const game = gameStates.get(gameId);
    if (!game) {
      return ctx.json({ error: 'Game not found' }, 404);
    }
    const gameJson = JSON.stringify(game, null, 2);
    const filename = `acquire-game-${gameId}.json`;
    Deno.writeTextFileSync(filename, gameJson);
    return ctx.text('saved ' + filename);
  });
  // Get game
  app.get('/api/games/:id', requireAuth, (ctx) => {
    const gameId = ctx.req.param('id') || '';
    const game = gameStates.get(gameId);
    if (!game) {
      return ctx.json({ error: 'Game not found' }, 404);
    }
    const user = ctx.get('user') || '';
    return ctx.json({ game: getPlayerView(user, game, playerActions.get(gameId) || []) });
  });
  // Get list of games
  app.get('/api/games', requireAuth, (ctx) => {
    const gameList: GameInfo[] = Array.from(gameStates.values()).map((game) => ({
      id: game.gameId,
      currentPlayer: game.players[game.pendingMergePlayer || game.currentPlayer].name,
      owner: game.owner,
      players: game.players.map((player) => player.name),
      phase: game.currentPhase,
      lastUpdated: game.lastUpdated,
    }));

    return ctx.json({ games: gameList });
  });
  // Main game action endpoint
  app.post('/api/games/:id', requireAuth, async (ctx) => {
    try {
      const gameId = ctx.req.param('id') || '';
      const bodyJson = await parseJsonBody(ctx);
      const user = ctx.get('user');

      if (!user) {
        return ctx.json({ error: 'Unauthorized' }, 401);
      }
      const { action } = bodyJson as { action: GameAction };

      // Security: always use JWT player
      action.payload.player = user;
      if (!action || !action.type) {
        return ctx.json(
          { error: 'Action is required with a type field' },
          400,
        );
      }

      const currentGame = gameStates.get(gameId);
      if (!currentGame) {
        return ctx.json({ error: 'Game not found' }, 404);
      }

      // Apply the action through your reducer
      const [updatedGame, actions] = processAction(currentGame, action);

      // Save the updated state
      gameStates.set(gameId, updatedGame);
      // Save the actions
      const currentActions = playerActions.has(gameId)
        ? playerActions.get(gameId)!.concat(actions)
        : actions;
      playerActions.set(gameId, currentActions);
      return ctx.json({
        game: getPlayerView(user, updatedGame, currentActions),
        action: action.type, // Echo back the action type for client confirmation
      });
    } catch (error) {
      console.error('Game action error:', error);
      return ctx.json({
        error: (error instanceof Error) ? error.message : String(error),
      }, 400);
    }
  });
  // Everything else is static
  app.use('/*', serveStatic({ root: '../client/dist' }));
  app.get('/*', async (c) => {
    const html = await Deno.readTextFile('../client/dist/index.html');
    return c.html(html);
  });
};
