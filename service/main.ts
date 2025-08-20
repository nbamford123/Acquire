import { cors } from "hono/cors";
import { getService } from "./routes.ts";

// Application setup
export const app = getService();

// CORS middleware (useful for frontend development)
app.use(
  "/*",
  cors({
    origin: "*", // Allow all origins for dev purposes
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 3600, // Cache preflight response for 1 hour
  }),
);

// Start server
const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`🎲 Acquire Server starting on port ${port}`);

await Deno.serve({ port }, app.fetch);
export type AppEnv = {
  Variables: {
    user?: string;
    // add other custom context variables here
  };
};
