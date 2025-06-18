// main.ts - Your Deno Deploy entry point
import { getCookies, setCookie } from 'https://deno.land/std@0.208.0/http/cookie.ts';
import { GameState } from '@/types/index.ts';

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

    // if (path.startsWith("/api/games/") && path.endsWith("/actions") && method === "POST") {
    //   const gameId = path.split("/")[3];
    //   return await applyAction(gameId, req);
    // }

    // 404 for unmatched routes
    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('Request error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

const jsonResponse = (data: any, status = 200): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
};

// Start the server
console.log('🎲 Board game service starting...');
Deno.serve({ port: 8000 }, handleRequest);
