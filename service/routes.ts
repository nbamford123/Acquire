import type { Context, Hono } from 'hono';
import type {
  ActionRequest,
  ActionResponse,
  CreateGameResponse,
  ErrorResponse,
  GameAction,
  GameInfo,
  GameResponse,
  GamesResponse,
  LeaderboardResponse,
  LoginRequest,
  LoginResponse,
} from '@acquire/engine/types';
import { GamePhase } from '@acquire/engine/types';
import { allowedNames, createToken, validateUser } from './auth.ts';
import { onDenoDeploy } from './env.ts';
import { newGameId } from './gameIds.ts';
import {
  createGame,
  deleteGame,
  getAllGames,
  getGameEntry,
  getGameState,
  getGameVersion,
  getLeaderboard,
  getPlayerActions,
  saveMove,
} from './dataLayer.ts';
import { initializeGame, processAction } from '@acquire/engine/core';

import type { ServiceEnv } from './types.ts';
import {
  getActivePlayer,
  getGameResults,
  getPlayerView,
  getSpectatorView,
} from '@acquire/engine/utils';
import { requireAuth } from './middleware.ts';
import { serveStatic } from '@hono/deno';
import { setCookie } from 'hono/cookie';

// The built client, found from this file so the service can run from any directory
export const clientDist = `${import.meta.dirname}/../client/dist`;

// Tries for a new game before giving up; with the default words, ids rarely collide
const GAME_ID_ATTEMPTS = 10;

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
      const { email } = bodyJson as Partial<LoginRequest>;
      const user = validateUser(email || '');
      if (!email || user === null) {
        return ctx.json({ error: 'Invalid login' }, 403);
      }
      // create jwt token and add it to cookie
      const token = await createToken(email);
      setCookie(ctx, 'auth', token, {
        httpOnly: true,
        secure: onDenoDeploy(), // HTTPS only; local development is plain http
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 365, // 1 year in milliseconds
      });
      return ctx.json({ success: true, user } satisfies LoginResponse);
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

      for (let attempt = 0; attempt < GAME_ID_ATTEMPTS; attempt++) {
        const game = initializeGame(newGameId(), user);
        if (await createGame(game)) {
          return ctx.json({ gameId: game.gameId } satisfies CreateGameResponse, 201);
        }
      }
      return ctx.json({ error: "Couldn't find a free game id; try again" }, 500);
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
  // Get game. With ?since=<lastUpdated>, it's 204 No Content if the game hasn't changed since then,
  // which costs a poll one small read instead of the whole game
  app.get('/api/games/:id', requireAuth, async (ctx) => {
    const gameId = ctx.req.param('id') || '';
    const since = Number(ctx.req.query('since'));
    if (Number.isFinite(since)) {
      const version = await getGameVersion(gameId);
      if (version !== null && version <= since) {
        return ctx.body(null, 204);
      }
    }
    const game = await getGameState(gameId);
    if (!game) {
      return ctx.json({ error: 'Game not found' }, 404);
    }
    const user = ctx.get('user') || '';
    const actions = await getPlayerActions(gameId);
    // Anyone not in the game can watch it
    const isPlayer = game.players.some((player) => player.name === user);
    return ctx.json(
      {
        game: isPlayer ? getPlayerView(user, game, actions) : getSpectatorView(game, actions),
      } satisfies GameResponse,
    );
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

    return ctx.json({ games: gameList } satisfies GamesResponse);
  });
  // Lifetime totals across finished games. Only players who can still log in show, so removing
  // someone from ALLOWED_EMAILS takes them off; their totals stay saved in case they come back.
  app.get('/api/leaderboard', requireAuth, async (ctx) => {
    const allowed = allowedNames();
    const players = (await getLeaderboard()).filter(({ name }) => allowed.has(name));
    return ctx.json({ players } satisfies LeaderboardResponse);
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
      const { action: clientAction } = bodyJson as Partial<ActionRequest>;
      if (!clientAction?.type) {
        return ctx.json(
          { error: 'Action is required with a type field' },
          400,
        );
      }
      // Act as the logged-in user, whatever the payload says
      const action = {
        ...clientAction,
        payload: { ...clientAction.payload, player: user },
      } as GameAction;

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
      // Stamp the change so polling clients can tell the game moved on. It always goes up, even
      // for two moves in the same millisecond.
      const lastUpdated = Math.max(Date.now(), currentGame.lastUpdated + 1);
      const updatedGame = { ...processedGame, lastUpdated };

      // The move that ends the game adds its results to the leaderboard
      const ended = updatedGame.currentPhase === GamePhase.GAME_OVER &&
        currentGame.currentPhase !== GamePhase.GAME_OVER;
      const results = ended ? getGameResults(updatedGame) : [];

      const saved = await saveMove(
        updatedGame,
        versionstamp,
        previousActions.length,
        actions,
        results,
      );
      if (!saved) {
        return ctx.json({ error: 'The game changed before your move was saved; try again' }, 409);
      }
      // A player who just left has no view of the game
      if (!updatedGame.players.some((player) => player.name === user)) {
        return ctx.json({ action: action.type } satisfies ActionResponse);
      }
      const currentActions = previousActions.concat(actions);
      return ctx.json(
        {
          game: getPlayerView(user, updatedGame, currentActions),
          action: action.type, // Echo back the action type for client confirmation
        } satisfies ActionResponse,
      );
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
