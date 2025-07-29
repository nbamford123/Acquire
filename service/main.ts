import { Application } from 'jsr:@oak/oak@17';

import { router } from './routes.ts';

// Application setup
const app = new Application();

// CORS middleware (useful for frontend development)
app.use(async (ctx, next) => {
  ctx.response.headers.set('Access-Control-Allow-Origin', '*');
  ctx.response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  ctx.response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (ctx.request.method === 'OPTIONS') {
    ctx.response.status = 204;
    ctx.response.body = undefined;
    return;
  }

  await next();
});

// JSON middleware
app.use(async (ctx, next) => {
  if (ctx.response.status !== 204) {
    ctx.response.headers.set('Content-Type', 'application/json');
  }
  await next();
});

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error('Server error:', err);
    ctx.response.status = 500;
    ctx.response.body = { error: 'Internal server error' };
  }
});

// Use routes
app.use(router.routes());
app.use(router.allowedMethods());

// Start server
const port = parseInt(Deno.env.get('PORT') || '8000');
console.log(`🎲 Acquire Server starting on port ${port}`);

await app.listen({ port });
