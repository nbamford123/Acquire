import { Hono } from 'hono';
import { assertEquals, assertStringIncludes, assertThrows } from '@std/assert';

import { addApiLog } from './apiLog.ts';
import { setRoutes } from './routes.ts';
import { clearCache } from './auth.ts';
import type { ServiceEnv } from './types.ts';

clearCache();
Deno.env.set('ALLOWED_EMAILS', 'TestUser:test@example.com');

const makeApp = () => {
  const app = new Hono<ServiceEnv>();
  addApiLog(app);
  setRoutes(app);
  return app;
};

const post = (app: Hono<ServiceEnv>, path: string, body: unknown) =>
  app.fetch(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

const page = async (app: Hono<ServiceEnv>) =>
  await (await app.fetch(new Request('http://localhost/dev/requests'))).text();

Deno.test('API log - lists requests newest first with their bodies', async () => {
  const app = makeApp();
  assertStringIncludes(await page(app), 'No requests yet.');

  // The route still reads the body the log copied
  const login = await post(app, '/api/login', { email: 'test@example.com' });
  assertEquals(login.status, 200);
  assertEquals((await login.json()).user, 'TestUser');
  const unauthorized = await app.fetch(new Request('http://localhost/api/games'));
  assertEquals(unauthorized.status, 401);

  const html = await page(app);
  const games = html.indexOf('GET /api/games → 401');
  const loggedIn = html.indexOf('POST /api/login → 200');
  assertEquals(games >= 0 && loggedIn > games, true);
  assertStringIncludes(html, '&quot;email&quot;: &quot;test@example.com&quot;');
  assertStringIncludes(html, '&quot;error&quot;: &quot;Authentication required&quot;');
});

Deno.test('API log - escapes what it shows', async () => {
  const app = makeApp();
  await post(app, '/api/login', { email: '<script>alert(1)</script>' });
  const html = await page(app);
  assertEquals(html.includes('<script>alert(1)'), false);
  assertStringIncludes(html, '&lt;script&gt;alert(1)&lt;/script&gt;');
});

Deno.test('API log - refuses to run in production', () => {
  Deno.env.set('ENV', 'production');
  try {
    assertThrows(() => addApiLog(new Hono<ServiceEnv>()));
  } finally {
    Deno.env.delete('ENV');
  }
});
