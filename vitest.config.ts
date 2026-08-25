import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Phase 5 test runner config. Alias resolution mirrors tsconfig.json's
 * "@/*" -> "./*" mapping (no vite-tsconfig-paths plugin is installed, so
 * this is done by hand rather than adding a new dependency for one alias).
 *
 * Tests run against pure/service-level code with a stubbed `pg`-style
 * transport where needed — nothing here talks to a real Neon branch. See
 * test/helpers/fake-db.ts for the in-memory `db.ts` stand-in used by
 * service-layer tests.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
    globals: false,
  },
});
