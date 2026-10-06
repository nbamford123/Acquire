import type { Hono } from 'hono';
import type { ServiceEnv } from './types.ts';
import { onDenoDeploy } from './env.ts';

// Local development only: records API requests and responses, shown newest first at /dev/requests.
// Bodies include login emails and game state, so this never runs on Deno Deploy.

// How many requests the page keeps
const KEEP = 100;

export interface LoggedRequest {
  at: number; // Timestamp
  method: string;
  path: string;
  user?: string;
  status: number;
  ms: number;
  request?: string;
  response?: string;
}

const escapeHtml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

// JSON bodies pretty-printed, anything else as it is
const pretty = (body: string) => {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
};

const renderBody = (label: string, body?: string) =>
  body ? `<h4>${label}</h4><pre>${escapeHtml(pretty(body))}</pre>` : '';

export const renderLog = (log: LoggedRequest[]) =>
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>API requests</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1rem; }
    summary { cursor: pointer; font-family: ui-monospace, monospace; padding: 0.25rem 0; }
    .error { color: #d93526; }
    pre { overflow-x: auto; padding: 0.5rem; border: 1px solid #8888; }
    h4 { margin: 0.5rem 0 0.25rem; }
  </style>
</head>
<body>
  <h1>API requests</h1>
  <p>The last ${KEEP}, newest first. <a href="">Refresh</a></p>
  ${
    log.length
      ? log.map((entry) => `
  <details>
    <summary class="${entry.status >= 400 ? 'error' : ''}">${
        new Date(entry.at).toLocaleTimeString()
      } ${escapeHtml(entry.method)} ${escapeHtml(entry.path)} → ${entry.status} (${entry.ms} ms)${
        entry.user ? ` as ${escapeHtml(entry.user)}` : ''
      }</summary>
    ${renderBody('Request', entry.request)}
    ${renderBody('Response', entry.response)}
  </details>`).join('')
      : '<p>No requests yet.</p>'
  }
</body>
</html>`;

export const addApiLog = (app: Hono<ServiceEnv>) => {
  if (onDenoDeploy()) {
    throw new Error('API_LOG is for local development and would expose request bodies');
  }
  const log: LoggedRequest[] = [];

  app.get('/dev/requests', (ctx) => ctx.html(renderLog(log)));

  app.use('/api/*', async (ctx, next) => {
    const started = performance.now();
    const request = ['GET', 'HEAD'].includes(ctx.req.method)
      ? undefined
      : await ctx.req.raw.clone().text();
    await next();
    const entry: LoggedRequest = {
      at: Date.now(),
      method: ctx.req.method,
      path: ctx.req.path,
      user: ctx.get('user'),
      status: ctx.res.status,
      ms: Math.round(performance.now() - started),
      request: request || undefined,
      response: (await ctx.res.clone().text()) || undefined,
    };
    log.unshift(entry);
    log.length = Math.min(log.length, KEEP);
    // Polls repeat every few seconds, so the console only gets changes and failures
    if (entry.method !== 'GET' || entry.status >= 400) {
      console.log(
        `📡 ${entry.method} ${entry.path} → ${entry.status} (${entry.ms} ms)${
          entry.user ? ` as ${entry.user}` : ''
        }`,
      );
    }
  });
};
