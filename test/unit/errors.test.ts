import { describe, it, expect, vi } from "vitest";
import {
  runAction,
  httpStatusForCode,
  UnauthenticatedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  InvalidTransitionError,
} from "@/lib/server/errors";

describe("runAction — consistent error handling for Server Actions / Route Handlers", () => {
  it("returns { ok: true, data } when the function succeeds", async () => {
    const result = await runAction(async () => 42);
    expect(result).toEqual({ ok: true, data: 42 });
  });

  it("converts a thrown AppError to a typed, client-safe error result", async () => {
    const result = await runAction(async () => {
      throw new ForbiddenError("no way", { area: "IDEA", action: "EDIT" });
    });
    expect(result).toEqual({
      ok: false,
      code: "FORBIDDEN",
      message: "no way",
      detail: { area: "IDEA", action: "EDIT" },
    });
  });

  it("every AppError subclass maps to its own code", async () => {
    const cases: [unknown, string][] = [
      [new UnauthenticatedError(), "UNAUTHENTICATED"],
      [new ForbiddenError(), "FORBIDDEN"],
      [new NotFoundError("Idea", "x"), "NOT_FOUND"],
      [new ValidationError(), "VALIDATION_ERROR"],
      [new ConflictError("dup"), "CONFLICT"],
      [new InvalidTransitionError("bad"), "INVALID_TRANSITION"],
    ];
    for (const [err, code] of cases) {
      const result = await runAction(async () => {
        throw err;
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe(code);
    }
  });

  it("never leaks a raw/unknown error's message to the client — logs it instead", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runAction(async () => {
      throw new Error("raw internal SQL detail: relation ideas does not exist");
    });
    expect(result).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("httpStatusForCode", () => {
  it("maps every code to the expected HTTP status", () => {
    expect(httpStatusForCode("UNAUTHENTICATED")).toBe(401);
    expect(httpStatusForCode("FORBIDDEN")).toBe(403);
    expect(httpStatusForCode("NOT_FOUND")).toBe(404);
    expect(httpStatusForCode("VALIDATION_ERROR")).toBe(400);
    expect(httpStatusForCode("CONFLICT")).toBe(409);
    expect(httpStatusForCode("INVALID_TRANSITION")).toBe(409);
    expect(httpStatusForCode("BLOCKED_PENDING_DECISION")).toBe(501);
    expect(httpStatusForCode("INTERNAL_ERROR")).toBe(500);
  });
});
