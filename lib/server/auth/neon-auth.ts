/**
 * Neon Auth (Managed Better Auth) singleton for this Next.js app.
 *
 * `createNeonAuth` (from `@neondatabase/auth/next/server`) is the current,
 * recommended integration point — it bundles the Better Auth server
 * methods, the `/api/auth/[...path]` route handler, and Next.js route
 * protection into one object. This is intentionally the ONLY place that
 * constructs it; every other server module (session resolution, the
 * mounted route handler, proxy.ts) imports `auth` from here.
 *
 * Uses the CURRENT Neon Auth product (Managed Better Auth) confirmed
 * during Phase 3's pre-Neon validation and provisioned in Phase 4 — NOT
 * the legacy Stack-Auth-based Neon Auth.
 */
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { getEnv } from "@/lib/server/env";

let instance: ReturnType<typeof createNeonAuth> | undefined;

export function getAuth() {
  if (!instance) {
    const env = getEnv();
    instance = createNeonAuth({
      baseUrl: env.NEON_AUTH_BASE_URL,
      cookies: {
        secret: env.NEON_AUTH_COOKIE_SECRET,
      },
    });
  }
  return instance;
}
