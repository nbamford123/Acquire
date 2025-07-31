import { serveFile } from 'jsr:@std/http/file-server';

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
    return new Response(
      `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Acquire</title>
        <script>
          if (location.hostname === 'localhost') {
            new EventSource('/reload').addEventListener('message', () => location.reload());
          }
        </script>
      </head>
      <body>
        <script type="module" src="/dist/bundle.js"></script>
      </body>
      </html>
      `,
      {
        headers: {
          'content-type': 'text/html',
          'cache-control': 'no-cache, no-store, must-revalidate',
          'pragma': 'no-cache',
          'expires': '0',
        },
      },
    );
  }

  try {
    const response = await serveFile(req, `.${url.pathname}`);
    // Add no-cache headers for bundle.js
    console.log(url.pathname);
    if (url.pathname.endsWith('bundle.js')) {
      const headers = new Headers(response.headers);
      headers.set('cache-control', 'no-cache, no-store, must-revalidate');
      headers.set('pragma', 'no-cache');
      headers.set('expires', '0');

      return new Response(response.body, {
        status: response.status,
        headers: headers,
      });
    } else {
      return response;
    }
  } catch {
    return new Response('Not Found', { status: 404 });
  }
};

console.log('Server running on http://localhost:8080');
Deno.serve({ port: 8080 }, handler);
