import { Application } from "https://deno.land/x/oak/mod.ts";

import { initializeGame } from '../../engine/core/gameInitialization.ts';
import { processAction } from '../../engine/core/gameEngine.ts';
import type { GameAction, GameState } from '@/types/index.ts';

// Simple in-memory store for demo - you'll want to use KV or external DB
const gameStates = new Map<string, GameState>();

// CORS headers for web app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Restrict this in production
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Route handling
    if (path === '/health') {
      return jsonResponse({ status: 'healthy', timestamp: new Date().toISOString() });
    }

    // if (path === "/api/games" && method === "POST") {
    //   return await createGame(req);
    // }

    // if (path.startsWith("/api/games/") && method === "GET") {
    //   const gameId = path.split("/")[3];
    //   return await getGame(gameId, req);
    // }

    if (path.startsWith('/api/games/') && path.endsWith('/actions') && method === 'POST') {
      const gameId = path.split('/')[3];
      return await applyAction(gameId, req);
    }

    // 404 for unmatched routes
    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('Request error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

const jsonResponse = (data: unknown, status = 200): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
};

// --- Action application handler ---
async function applyAction(gameId: string, req: Request): Promise<Response> {
  const currentState = gameStates.get(gameId);
  if (!currentState) {
    return jsonResponse({ error: 'Game not found' }, 404);
  }
  let action: GameAction;
  try {
    action = await req.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }
  try {
    const newState = processAction(currentState, action);
    gameStates.set(gameId, newState);
    return jsonResponse(newState);
  } catch (e) {
    return jsonResponse({ error: (e instanceof Error ? e.message : 'Action failed') }, 400);
  }
}

// Start the server
console.log('🎲 Board game service starting...');
Deno.serve({ port: 8000 }, handleRequest);
