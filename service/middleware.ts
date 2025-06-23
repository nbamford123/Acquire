import { Context, Next } from 'jsr:@oak/oak@17';

import { verifyToken } from './auth.ts';

export const requireAuth = async (ctx: Context, next: Next) => {
  const token = await ctx.cookies.get('auth');

  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: 'Authentication required' };
    return;
  }

  const user = await verifyToken(token);
  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: 'Invalid token' };
    return;
  }

  ctx.state.user = user;
  await next();
};
