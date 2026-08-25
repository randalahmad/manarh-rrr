import { vi } from "vitest";

/**
 * lib/server/auth/neon-auth.ts imports @neondatabase/auth/next/server,
 * which in turn imports next/headers via a subpath Vitest's plain Node
 * module resolution can't follow (it needs Next's own bundler/runtime).
 * That import chain is otherwise pulled in transitively by ANY module that
 * imports lib/server/auth/guards.ts or lib/server/auth/session.ts — i.e.
 * almost every service — even though the actual Neon Auth SDK is never
 * exercised by these unit/service tests (they construct Actor fixtures
 * directly rather than resolving a real session).
 *
 * Mocking the module at its source keeps guards.ts/session.ts's own real
 * (pure, or DB-mocked) logic under test, while cutting the one edge that
 * can't run outside a real Next.js build. Any test that DOES need
 * getAuth()'s behavior should mock it locally with its own expectations —
 * this default just fails loudly instead of crashing on the missing
 * subpath if something unexpectedly calls it.
 */
vi.mock("@/lib/server/auth/neon-auth", () => ({
  getAuth: vi.fn(() => {
    throw new Error(
      "getAuth() was called in a test without a local mock. Real Neon Auth is never exercised by " +
        "these tests — if a test needs session-resolution behavior, mock @/lib/server/auth/session directly."
    );
  }),
}));
