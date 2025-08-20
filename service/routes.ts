import type { Context, Hono } from "hono";
import { setCookie } from "hono/cookie";
import { initializeGame } from "../engine/core/gameInitialization.ts";
import { processAction } from "../engine/core/gameEngine.ts";
import type { GameAction, GameState } from "../shared/types/index.ts";

import { createToken, isEmailAllowed } from "./auth.ts";
import { requireAuth } from "./middleware.ts";
import type { ServiceEnv } from "./types.ts";

// Simple in-memory store for demo - you'll want to use KV or external DB
const gameStates = new Map<string, GameState>();

// Only force https when in production
const isProduction = Deno.env.get("ENV") === "production";

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).substring(2);

const parseJsonBody = async (ctx: Context) => {
  try {
    return await ctx.req.json();
  } catch {
    throw new Error("Invalid JSON in request body");
  }
};
export const setRoutes = (app: Hono<ServiceEnv>) => {
  // Health check
  app.get("/", (ctx) => {
    return ctx.json({ message: "Acquire Server is running!" });
  });
  // login
  app.post("/api/login", async (ctx) => {
    try {
      const bodyJson = await parseJsonBody(ctx);
      const { email } = bodyJson as { email?: string };

      if (!email || !isEmailAllowed(email)) {
        return ctx.json({ error: "Access denied" }, 403);
      }
      // create jwt token and add it to cookie
      const token = await createToken(email);
      setCookie(ctx, "auth", token, {
        httpOnly: true,
        secure: isProduction, // HTTPS only
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 365, // 1 year in milliseconds
      });
      return ctx.json({ success: true, email });
    } catch (error) {
      return ctx.json({
        error: (error instanceof Error) ? error.message : String(error),
      }, 400);
    }
  });
  // Create game
  app.post("/api/games", requireAuth, async (ctx) => {
    try {
      const bodyJson = await parseJsonBody(ctx);
      const { player } = bodyJson as { player?: string };

      if (!player) {
        return ctx.json({ error: "Player name is required" }, 400);
      }
      const gameId = uid();
      const game = initializeGame(gameId, player);
      gameStates.set(gameId, game);

      return ctx.json({ gameId: gameId }, 201);
    } catch (error) {
      return ctx.json({
        error: (error instanceof Error) ? error.message : String(error),
      }, 400);
    }
  });
  // Delete game
  app.delete("/api/games/:id", requireAuth, async (ctx) => {
    const gameId = ctx.req.param("id") || "";
    const game = gameStates.get(gameId);

    if (!game) {
      return ctx.json({ error: "Game not found" }, 404);
    }
    gameStates.delete(gameId);
    await Promise.resolve(); // Simulate async operation
    return ctx.body(null, 204);
  });
  // Get game-- note this will need to return a player view!
  app.get("/api/games/:id", requireAuth, (ctx) => {
    const gameId = ctx.req.param("id") || "";
    const game = gameStates.get(gameId);

    if (!game) {
      return ctx.json({ error: "Game not found" }, 404);
    }

    return ctx.json({ game });
  });
  // Get list of games
  app.get("/api/games", requireAuth, (ctx) => {
    const gameList = Array.from(gameStates.values()).map((game) => ({
      id: game.gameId,
      players: game.players.map((player) => player.name),
      phase: game.currentPhase,
      lastUpdated: game.lastUpdated,
    }));

    return ctx.json({ games: gameList });
  });
  // Main game action endpoint
  app.post("/api/games/:id", requireAuth, async (ctx) => {
    try {
      const gameId = ctx.req.param("id") || "";
      const bodyJson = await parseJsonBody(ctx);
      const user = ctx.get("user");

      if (!user) {
        return ctx.json({ error: "Unauthorized" }, 401);
      }
      const { action } = bodyJson as { action: GameAction };

      // Security: always user JWT player
      action.payload.player = user;
      if (!action || !action.type) {
        return ctx.json(
          { error: "Action is required with a type field" },
          400,
        );
      }

      const currentGame = gameStates.get(gameId);
      if (!currentGame) {
        return ctx.json({ error: "Game not found" }, 404);
      }

      // Apply the action through your reducer
      const updatedGame = processAction(currentGame, action);

      // Save the updated state
      gameStates.set(gameId, updatedGame);

      return ctx.json({
        game: updatedGame,
        action: action.type, // Echo back the action type for client confirmation
      });
    } catch (error) {
      console.error("Game action error:", error);
      return ctx.json({
        error: (error instanceof Error) ? error.message : String(error),
      }, 400);
    }
  });
};
