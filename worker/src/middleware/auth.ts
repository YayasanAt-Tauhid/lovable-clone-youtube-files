/**
 * worker/src/middleware/auth.ts
 *
 * JWT authentication middleware for Hono.
 * Reads the JWT from the Authorization: Bearer <token> header,
 * verifies it against Clerk's JWKS endpoint, and sets the
 * authenticated userId in the Hono context for downstream handlers.
 *
 * Used by: worker/src/index.ts (applied to all /api/* routes)
 */

import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Context, Next } from "hono";
import type { Env, AppVariables } from "../types";

/**
 * Hono middleware that verifies a Clerk-issued JWT.
 * On success, sets c.var.userId to the token's `sub` claim.
 * On failure (missing header, invalid token, wrong issuer), returns 401.
 *
 * @param c - Hono context with typed Env bindings and AppVariables
 * @param next - Next middleware in the chain
 */
export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: AppVariables }>,
  next: Next
): Promise<Response | void> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const JWKS = createRemoteJWKSet(new URL(c.env.CLERK_JWKS_URL));
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: c.env.CLERK_ISSUER,
    });

    c.set("userId", payload.sub as string);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
}
