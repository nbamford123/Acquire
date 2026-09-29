import type { Context, Hono } from 'hono';
import type { GameAction, GameInfo, GameState, PlayerAction } from '@acquire/engine/types';
import { createToken, validateUser } from './auth.ts';
import {
  deleteGame,
  getAllGames,
  getGameEntry,
  getGameState,
  getPlayerActions,
  saveGameState,
  saveMove,
} from './dataLayer.ts';
import { initializeGame, processAction } from '@acquire/engine/core';

import type { ServiceEnv } from './types.ts';
import { getActivePlayer, getPlayerView } from '@acquire/engine/utils';
import { requireAuth } from './middleware.ts';
import { serveStatic } from 'hono/deno';
import { setCookie } from 'hono/cookie';

// Only force https when in production
const isProduction = Deno.env.get('ENV') === 'production';

// The built client, found from this file so the service can run from any directory
const clientDist = `${import.meta.dirname}/../client/dist`;

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
  app.post('/api/games', requireAuth, async (ctx) => {
    try {
      const user = ctx.get('user') || '';

      const gameId = uid();
      const game = initializeGame(gameId, user);
      await saveGameState(game);
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
    const game = await getGameState(gameId);
    if (!game) {
      return ctx.json({ error: 'Game not found' }, 404);
    }
    if (game.owner !== ctx.get('user')) {
      return ctx.json({ error: 'Only the owner can delete a game' }, 403);
    }
    await deleteGame(gameId);
    return ctx.body(null, 204);
  });
  // Get game
  app.get('/api/games/:id', requireAuth, async (ctx) => {
    const gameId = ctx.req.param('id') || '';
    const game = await getGameState(gameId);
    if (!game) {
      return ctx.json({ error: 'Game not found' }, 404);
    }
    const user = ctx.get('user') || '';
    const actions = await getPlayerActions(gameId);
    return ctx.json({ game: getPlayerView(user, game, actions) });
  });
  // Get list of games
  app.get('/api/games', requireAuth, async (ctx) => {
    const gameList: GameInfo[] = Array.from((await getAllGames()).map((game) => ({
      id: game.gameId,
      currentPlayer: game.players[getActivePlayer(game)].name,
      owner: game.owner,
      players: game.players.map((player) => player.name),
      phase: game.currentPhase,
      lastUpdated: game.lastUpdated,
    })));

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

      const { value: currentGame, versionstamp } = await getGameEntry(gameId);
      if (!currentGame || !versionstamp) {
        return ctx.json({ error: 'Game not found' }, 404);
      }
      // The player view needs the log too. Actions are only saved with a new state, so if one is
      // saved after this read, the versionstamp check below fails.
      const previousActions = await getPlayerActions(gameId);

      const [processedGame, actions] = processAction(currentGame, action);
      // The engine reports rejected moves on the state; don't save them, just tell the player why
      if (processedGame.error) {
        return ctx.json({ error: processedGame.error.message }, 400);
      }
      // Stamp the change so polling clients can tell the game moved on
      const updatedGame = { ...processedGame, lastUpdated: Date.now() };

      const saved = await saveMove(updatedGame, versionstamp, previousActions.length, actions);
      if (!saved) {
        return ctx.json({ error: 'The game changed before your move was saved; try again' }, 409);
      }
      const currentActions = previousActions.concat(actions);
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
  app.use('/*', serveStatic({ root: clientDist }));
  app.get('/*', async (c) => {
    const html = await Deno.readTextFile(`${clientDist}/index.html`);
    return c.html(html);
  });
};
