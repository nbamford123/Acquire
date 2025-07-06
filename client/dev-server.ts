import { serveFile } from "jsr:@std/http/file-server";

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  if (url.pathname === "/") {
    return new Response(
      `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Acquire</title>
      </head>
      <body>
        <script type="module" src="/dist/bundle.js"></script>
      </body>
      </html>
    `,
      {
        headers: { "content-type": "text/html" },
      },
    );
  }

  try {
    return await serveFile(req, `.${url.pathname}`);
  } catch {
    return new Response("Not Found", { status: 404 });
  }
};

console.log("Server running on http://localhost:8080");
Deno.serve({ port: 8080 }, handler);
