import type { Hono } from 'hono';
import type { ServiceEnv } from './types.ts';

// Local development only: reloads open pages when the client bundle is rebuilt, and when the service
// restarts, since the page reconnects then
const reloadScript = `<script>
  {
    let connected = false;
    const source = new EventSource('/dev/reload');
    source.addEventListener('open', () => {
      if (connected) location.reload();
      connected = true;
    });
    source.addEventListener('message', () => location.reload());
  }
</script>`;

// Rebuilds write the bundle and its source map in quick succession, so wait for them to settle
const SETTLE_MS = 100;

export const addDevReload = (app: Hono<ServiceEnv>, clientDist: string) => {
  const pages = new Set<ReadableStreamDefaultController<string>>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  (async () => {
    for await (const event of Deno.watchFs(clientDist)) {
      // Editors and bundlers write by modifying, creating, or renaming, so take any of them
      if (!event.paths.some((path) => path.endsWith('.js'))) continue;
      clearTimeout(timer);
      timer = setTimeout(() => {
        for (const page of pages) {
          try {
            page.enqueue('data: reload\n\n');
          } catch {
            pages.delete(page);
          }
        }
      }, SETTLE_MS);
    }
  })();

  app.get('/dev/reload', () => {
    let page: ReadableStreamDefaultController<string>;
    const stream = new ReadableStream<string>({
      start(controller) {
        page = controller;
        pages.add(page);
        controller.enqueue(': connected\n\n');
      },
      cancel() {
        pages.delete(page);
      },
    });
    return new Response(stream.pipeThrough(new TextEncoderStream()), {
      headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
    });
  });

  // Add the script to every page, and don't let the browser cache the bundle
  app.use('*', async (ctx, next) => {
    await next();
    if (ctx.req.path.endsWith('.js') || ctx.req.path.endsWith('.map')) {
      ctx.res.headers.set('cache-control', 'no-store');
    }
    if (ctx.res.headers.get('content-type')?.startsWith('text/html')) {
      const html = await ctx.res.text();
      const headers = new Headers(ctx.res.headers);
      headers.delete('content-length');
      ctx.res = new Response(html.replace('</head>', `${reloadScript}\n</head>`), {
        status: ctx.res.status,
        headers,
      });
    }
  });
};
