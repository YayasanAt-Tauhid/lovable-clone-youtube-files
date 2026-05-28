/**
 * worker/src/routes/credits.ts
 *
 * Endpoint for querying the authenticated user's credit balance.
 *
 * Endpoint:
 *   GET /api/credits  — Returns the user's current credit record
 *
 * The response includes remaining credits, total allocation, plan type,
 * and the current billing period start/end dates.
 *
 * Used by: worker/src/index.ts
 */

import { Hono } from "hono";
import type { Env, AppVariables } from "../types";
import { getCredits } from "../services/credits";

export const creditsRouter = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

// ---------------------------------------------------------------------------
// GET / — Return the authenticated user's credit balance
// ---------------------------------------------------------------------------

creditsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const credits = await getCredits(userId, c.env);
  return c.json(credits);
});
