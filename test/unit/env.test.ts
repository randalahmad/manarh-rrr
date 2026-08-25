import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getEnv, __resetEnvCacheForTests } from "@/lib/server/env";

const REQUIRED = {
  DATABASE_URL: "postgresql://user:pass@host/db?sslmode=require",
  NEON_AUTH_BASE_URL: "https://example.neonauth.example/neondb/auth",
  NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
};

describe("getEnv — fails fast on missing/malformed server config", () => {
  beforeEach(() => {
    __resetEnvCacheForTests();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    __resetEnvCacheForTests();
    vi.unstubAllEnvs();
  });

  it("parses valid env into a frozen, typed object", () => {
    for (const [k, v] of Object.entries(REQUIRED)) vi.stubEnv(k, v);
    const env = getEnv();
    expect(env.DATABASE_URL).toBe(REQUIRED.DATABASE_URL);
    expect(Object.isFrozen(env)).toBe(true);
  });

  it("throws with a clear, non-leaking message when DATABASE_URL is missing", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NEON_AUTH_BASE_URL", REQUIRED.NEON_AUTH_BASE_URL);
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", REQUIRED.NEON_AUTH_COOKIE_SECRET);
    expect(() => getEnv()).toThrow(/DATABASE_URL/);
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    vi.stubEnv("DATABASE_URL", "mysql://user:pass@host/db");
    vi.stubEnv("NEON_AUTH_BASE_URL", REQUIRED.NEON_AUTH_BASE_URL);
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", REQUIRED.NEON_AUTH_COOKIE_SECRET);
    expect(() => getEnv()).toThrow(/postgres connection string/);
  });

  it("rejects a cookie secret shorter than 32 characters", () => {
    vi.stubEnv("DATABASE_URL", REQUIRED.DATABASE_URL);
    vi.stubEnv("NEON_AUTH_BASE_URL", REQUIRED.NEON_AUTH_BASE_URL);
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "too-short");
    expect(() => getEnv()).toThrow(/at least 32 characters/);
  });

  it("caches the parsed result across calls (only validates once)", () => {
    for (const [k, v] of Object.entries(REQUIRED)) vi.stubEnv(k, v);
    const first = getEnv();
    const second = getEnv();
    expect(first).toBe(second);
  });
});
