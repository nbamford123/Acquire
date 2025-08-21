import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';

import { verifyToken } from './auth.ts';
import { type ServiceEnv } from './types.ts';

export const requireAuth: MiddlewareHandler<ServiceEnv> = async (ctx, next) => {
  const token = getCookie(ctx, 'auth');
  if (!token) {
    return ctx.json({ error: 'Authentication required' }, 401);
  }

  const verifyResult = await verifyToken(token);
  if (!verifyResult) {
    return ctx.json({ error: 'Invalid token' }, 401);
  }

  ctx.set('user', verifyResult.user);
  await next();
};
