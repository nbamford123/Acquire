import { serveFile } from '@std/http/file-server';
import { join } from '@std/path';

// Store connected clients for live reload
const clients = new Set<ReadableStreamDefaultController>();

const watcher = Deno.watchFs(['./src']);

const buildBundle = async () => {
  const build = new Deno.Command('deno', {
    args: [
      'bundle',
      '--platform',
      'browser',
      '--output',
      'dist/bundle.js',
      '--sourcemap=external',
      'src/main.ts',
    ],
  });
  await build.output();
  console.log('📦 Bundle rebuilt');

  // Notify all connected clients to reload
  notifyReload();
};

const notifyReload = () => {
  clients.forEach((controller) => {
    try {
      controller.enqueue(`data: reload\n\n`);
    } catch {
      clients.delete(controller);
    }
  });
};

// Build initially
await buildBundle();

// Watch for changes
(async () => {
  for await (const event of watcher) {
    if (
      event.kind === 'modify' &&
      event.paths.some((path) => path.endsWith('.ts'))
    ) {
      await buildBundle();
    }
  }
})();

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  if (url.pathname === '/reload') {
    const stream = new ReadableStream({
      start(controller) {
        clients.add(controller);
        controller.enqueue(`data: connected\n\n`);
      },
      cancel(controller) {
        clients.delete(controller);
      },
    });

    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        'connection': 'keep-alive',
      },
    });
  }

  if (url.pathname.startsWith('/api')) {
    //Proxy to api server on 8000
    const proxyUrl = new URL(req.url);
    proxyUrl.protocol = 'http:';
    proxyUrl.hostname = 'localhost';
    proxyUrl.port = '8000';

    // Forward method, headers, and body
    const proxyReq = new Request(proxyUrl, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      redirect: 'manual',
    });

    // Fetch from backend and return response
    const proxyRes = await fetch(proxyReq);

    // Clone headers to avoid immutable issues
    const headers = new Headers(proxyRes.headers);
    // Optionally, you can adjust CORS or other headers here

    return new Response(proxyRes.body, {
      status: proxyRes.status,
      statusText: proxyRes.statusText,
      headers,
    });
  }

  if (url.pathname === '/') {
    return await serveFile(req, join('public', 'index.html'));
  }
  const publicPath = join('public', url.pathname);
  let resp = await serveFile(req, publicPath);
  if (resp.status === 404) {
    // Then try dist (built files)
    resp = await serveFile(req, `.${url.pathname}`);
    if (resp.status === 404) {
      // SPA fallback
      if (!url.pathname.includes('.')) {
        return await serveFile(req, './public/index.html');
      }
      return new Response('Not Found', { status: 404 });
    }
  }
  // Ensure JS bundles and sourcemaps are not cached by the browser in dev
  try {
    const contentType = resp.headers.get('content-type') ?? '';
    const isJs = url.pathname.endsWith('.js') ||
      contentType.includes('javascript');
    const isMap = url.pathname.endsWith('.map') ||
      contentType.includes('application/json');

    if (isJs || isMap) {
      const headers = new Headers(resp.headers);
      // Strong no-cache for dev server
      headers.set(
        'cache-control',
        'no-store, no-cache, must-revalidate, max-age=0',
      );
      headers.set('pragma', 'no-cache');
      headers.set('expires', '0');

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers,
      });
    }
  } catch {
    // If headers/body cannot be read for some reason, fall back to original response
  }

  return resp;
};

console.log('Server running on http://localhost:8080');
Deno.serve({ port: 8080 }, handler);
