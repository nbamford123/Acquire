import { Router } from 'jsr:@oak/oak@17';

import { initializeGame } from '../engine/core/gameInitialization.ts';
import { processAction } from '../engine/core/gameEngine.ts';
import type { GameAction, GameState } from '@/types/index.ts';

import { createToken, isEmailAllowed } from './auth.ts';
import { requireAuth } from './middleware.ts';

// Simple in-memory store for demo - you'll want to use KV or external DB
const gameStates = new Map<string, GameState>();

// Only force https when in production
const isProduction = Deno.env.get('ENV') === 'production';

export const router = new Router();

const uid = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

// Health check
router.get('/', (ctx) => {
  ctx.response.body = { message: 'Acquire Server is running!' };
});

// login
router.post('/login', async (ctx) => {
  const bodyJson = await ctx.request.body.json();
  const { email } = bodyJson as { email?: string };

  if (!email || !isEmailAllowed(email)) {
    ctx.response.status = 403;
    ctx.response.body = { error: 'Access denied' };
    return;
  }

  // create jwt token and add it to cookie
  const token = await createToken(email);
  ctx.cookies.set('auth', token, {
    httpOnly: true,
    secure: isProduction, // HTTPS only
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year in milliseconds
  });

  ctx.response.body = { success: true, email };
});

// Create game
router.post('/games', requireAuth, async (ctx) => {
  try {
    const bodyJson = await ctx.request.body.json();
    const { playerName } = bodyJson as { playerName?: string };

    if (!playerName) {
      ctx.response.status = 400;
      ctx.response.body = { error: 'Player name is required' };
      return;
    }
    const gameId = uid();
    const game = initializeGame(gameId, playerName);
    gameStates.set(gameId, game);

    ctx.response.status = 201;
    ctx.response.body = { gameId: gameId };
  } catch (error) {
    ctx.response.status = 400;
    ctx.response.body = { error: (error instanceof Error) ? error.message : String(error) };
  }
});

// Delete game
router.delete('/games/:id', requireAuth, (ctx) => {
  const gameId = ctx.params.id;
  const game = gameStates.get(gameId);

  if (!game) {
    ctx.response.status = 404;
    ctx.response.body = { error: 'Game not found' };
    return;
  }

  gameStates.delete(gameId);
  ctx.response.status = 204;
});

// Get game-- note this will need to return a player view!
router.get('/games/:id', requireAuth, (ctx) => {
  const gameId = ctx.params.id;
  const game = gameStates.get(gameId);

  if (!game) {
    ctx.response.status = 404;
    ctx.response.body = { error: 'Game not found' };
    return;
  }

  ctx.response.status = 200;
  ctx.response.body = { game };
});

// Get list of games
router.get('/games', requireAuth, (ctx) => {
  const gameList = Array.from(gameStates.values()).map((game) => ({
    id: game.gameId,
    players: game.players.map((player) => player.name),
    phase: game.currentPhase,
    lastUpdated: game.lastUpdated,
  }));

  ctx.response.body = { games: gameList };
});

// Main game action endpoint
router.post('/games/:id', requireAuth, async (ctx) => {
  try {
    const gameId = ctx.params.id;
    const bodyJson = await ctx.request.body.json();
    const { action } = bodyJson as { action: GameAction };

    if (!action || !action.type) {
      ctx.response.status = 400;
      ctx.response.body = { error: 'Action is required with a type field' };
      return;
    }

    const currentGame = gameStates.get(gameId);
    if (!currentGame) {
      ctx.response.status = 404;
      ctx.response.body = { error: 'Game not found' };
      return;
    }

    // Apply the action through your reducer
    const updatedGame = processAction(currentGame, action);

    // Save the updated state
    gameStates.set(gameId, updatedGame);

    ctx.response.body = {
      game: updatedGame,
      action: action.type, // Echo back the action type for client confirmation
    };
  } catch (error) {
    console.error('Game action error:', error);
    ctx.response.status = 400;
    ctx.response.body = { error: (error instanceof Error) ? error.message : String(error) };
  }
});
