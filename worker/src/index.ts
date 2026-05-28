/**
 * worker/src/index.ts
 *
 * Cloudflare Worker entry point.
 *
 * Sets up a Hono application with:
 *   - Dynamic CORS (respects FRONTEND_URL env var, falls back to localhost)
 *   - A public /health endpoint (no auth required)
 *   - Webhook routes mounted BEFORE the auth middleware (Clerk sends these,
 *     not end users, so there is no Bearer token to verify)
 *   - JWT authentication middleware applied to all /api/* routes
 *   - Sub-routers for every feature area:
 *       /api/projects   — project CRUD
 *       /api/projects   — chat / SSE streaming (same prefix, different paths)
 *       /api/projects   — version history
 *       /api/projects   — ZIP export
 *       /api/credits    — credit balance
 *       /api/analytics  — aggregated usage stats
 *   - A catch-all 404 handler
 *
 * The default export is the Hono app, which Cloudflare Workers picks up
 * automatically as the fetch handler.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, AppVariables } from "./types";
import { authMiddleware } from "./middleware/auth";
import { projectsRouter } from "./routes/projects";
import { chatRouter } from "./routes/chat";
import { versionsRouter } from "./routes/versions";
import { creditsRouter } from "./routes/credits";
import { webhooksRouter } from "./routes/webhooks";
import { analyticsRouter } from "./routes/analytics";
import { exportRouter } from "./routes/export";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// ---------------------------------------------------------------------------
// CORS — must run before all routes so OPTIONS pre-flights are handled
// ---------------------------------------------------------------------------

app.use("*", async (c, next) => {
  const origin = c.env.FRONTEND_URL ?? "http://localhost:3000";
  return cors({
    origin: [origin, "http://localhost:3000", "https://lovable-clone.vercel.app"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })(c, next);
});

// ---------------------------------------------------------------------------
// Health check — public, no auth
// ---------------------------------------------------------------------------

app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));

// ---------------------------------------------------------------------------
// Webhooks — mounted before auth middleware (no Bearer token from Clerk)
// ---------------------------------------------------------------------------

app.route("/api/webhooks", webhooksRouter);

// ---------------------------------------------------------------------------
// Auth middleware — protects all remaining /api/* routes
// ---------------------------------------------------------------------------

app.use("/api/*", authMiddleware);

// ---------------------------------------------------------------------------
// Protected API routes
// ---------------------------------------------------------------------------

// Project CRUD: GET /, POST /, GET /:id, PATCH /:id, DELETE /:id
app.route("/api/projects", projectsRouter);

// Chat / SSE: GET /:id/chat, POST /:id/chat, PATCH /:id/chat/save
app.route("/api/projects", chatRouter);

// Version history: GET /:id/versions, GET /:id/versions/:vn, POST /:id/versions/:vn/restore
app.route("/api/projects", versionsRouter);

// Export: GET /:id/export
app.route("/api/projects", exportRouter);

// Credits: GET /
app.route("/api/credits", creditsRouter);

// Analytics: GET /
app.route("/api/analytics", analyticsRouter);

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
