/**
 * worker/src/routes/webhooks.ts
 *
 * Hono router for Clerk billing webhooks.
 *
 * Endpoint:
 *   POST /api/webhooks/clerk  — Receive and verify Clerk webhook events
 *
 * Events handled:
 *   user.created              — Initialize a new free-tier credits record
 *   subscription.created      — Upgrade user to Pro plan
 *   subscription.updated      — Upgrade user to Pro plan
 *   subscription.deleted      — Downgrade user back to Free plan
 *   subscription.cancelled    — Downgrade user back to Free plan
 *
 * Webhook signatures are verified using the `svix` library with the
 * CLERK_WEBHOOK_SECRET environment variable. Requests with invalid or
 * missing signatures are rejected with 400.
 *
 * NOTE: This router is mounted BEFORE the auth middleware in index.ts
 * because webhook requests come from Clerk's servers, not end-user
 * browsers, and do not carry a Bearer token.
 *
 * Used by: worker/src/index.ts
 */

import { Hono } from "hono";
import { Webhook } from "svix";
import type { Env, AppVariables } from "../types";
import {
  upgradePlan,
  downgradePlan,
  initializeCredits,
} from "../services/credits";

export const webhooksRouter = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

// ---------------------------------------------------------------------------
// POST /clerk — Verify Svix signature and process the event
// ---------------------------------------------------------------------------

webhooksRouter.post("/clerk", async (c) => {
  const webhookSecret = c.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return c.json({ error: "Webhook secret not configured" }, 500);
  }

  // Svix requires all three headers to verify the signature
  const svixId = c.req.header("svix-id");
  const svixTimestamp = c.req.header("svix-timestamp");
  const svixSignature = c.req.header("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return c.json({ error: "Missing svix headers" }, 400);
  }

  const body = await c.req.text();
  const wh = new Webhook(webhookSecret);

  // Typed shape of the incoming webhook payload
  interface ClerkEvent {
    type: string;
    data: Record<string, unknown>;
  }

  let event: ClerkEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch {
    return c.json({ error: "Invalid signature" }, 400);
  }

  const { type, data } = event;

  // -------------------------------------------------------------------------
  // user.created — Initialize credits for a brand-new user
  // -------------------------------------------------------------------------
  if (type === "user.created") {
    const userId = data.id as string;
    if (userId) {
      await initializeCredits(userId, "free", c.env);
    }
  }

  // -------------------------------------------------------------------------
  // subscription.created / subscription.updated — Upgrade to Pro
  // -------------------------------------------------------------------------
  if (type === "subscription.created" || type === "subscription.updated") {
    // Clerk billing may use either subscriber_id or user_id depending on the
    // plan configuration — check both to be safe.
    const userId = ((data.subscriber_id ?? data.user_id) as string) || "";
    if (userId) {
      await upgradePlan(userId, c.env);
    }
  }

  // -------------------------------------------------------------------------
  // subscription.deleted / subscription.cancelled — Downgrade to Free
  // -------------------------------------------------------------------------
  if (
    type === "subscription.deleted" ||
    type === "subscription.cancelled"
  ) {
    const userId = ((data.subscriber_id ?? data.user_id) as string) || "";
    if (userId) {
      await downgradePlan(userId, c.env);
    }
  }

  return c.json({ received: true });
});
