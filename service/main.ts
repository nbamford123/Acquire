import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { setRoutes } from './routes.ts';
import type { ServiceEnv } from './types.ts';

// Application setup
export const app = new Hono<ServiceEnv>();
setRoutes(app);
// CORS middleware
app.use(
  '/*',
  cors({
    origin: (origin) => {
      const allowed = [
        'https://acquire.nbamford123.deno.dev',
        'http://localhost:8000',
      ];
      return allowed.includes(origin) ? origin : allowed[0];
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

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
