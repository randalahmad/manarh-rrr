/**
 * Mounts Neon Auth's own API (sign-in, sign-up, session, OAuth callbacks,
 * ...) at /api/auth/*. This is the one Route Handler Phase 4 anticipated
 * ("no Route Handlers beyond what Neon Auth itself requires") and Phase 5
 * now adds. It does not implement any Manarah business logic — it proxies
 * to the Neon Auth server configured in lib/server/auth/neon-auth.ts.
 */
import { getAuth } from "@/lib/server/auth/neon-auth";

export const { GET, POST, PUT, DELETE, PATCH } = getAuth().handler();
