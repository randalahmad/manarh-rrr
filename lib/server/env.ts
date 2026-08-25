/**
 * Validated server-side environment configuration.
 *
 * Read once, validated with zod, and re-exported as a typed, frozen object.
 * Import `env` anywhere on the server instead of reading `process.env`
 * directly — a missing or malformed variable fails loudly at import time
 * (during `next build` / first request) instead of surfacing as a confusing
 * runtime error deep inside a query.
 *
 * NEVER import this file from client components — it is server-only and
 * intentionally has no "use client" escape hatch. `next.config.ts` /
 * bundling will already refuse to ship `DATABASE_URL` etc. to the client,
 * but keeping all env access behind this one module makes that boundary
 * explicit and auditable.
 */
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: "DATABASE_URL must be a postgres connection string",
    }),
  NEON_AUTH_BASE_URL: z.string().url("NEON_AUTH_BASE_URL must be a valid URL"),
  NEON_AUTH_COOKIE_SECRET: z
    .string()
    .min(32, "NEON_AUTH_COOKIE_SECRET must be at least 32 characters"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Lazily validates and caches process.env against the schema above.
 * Lazy (not module-top-level) so that importing this module in a test file
 * that provides its own env via `vi.stubEnv` doesn't throw before the test
 * has a chance to set values.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid server environment configuration:\n${issues}\n\nSee .env.example for the full list of required variables.`
    );
  }
  cached = Object.freeze(parsed.data);
  return cached;
}

/** Test-only: clear the cached env so a test can re-validate with stubbed values. */
export function __resetEnvCacheForTests() {
  cached = undefined;
}
