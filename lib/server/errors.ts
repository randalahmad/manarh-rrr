/**
 * Typed error hierarchy for the backend application layer, plus consistent
 * translation to what a Server Action / Route Handler returns to the
 * client. Every service function throws one of these (never a bare
 * `Error` or `string`) so callers can branch on `error.code` and so the
 * action/route boundary can map errors to a stable shape without leaking
 * internals (stack traces, raw SQL errors, table names) to the client.
 */

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "INVALID_TRANSITION"
  | "BLOCKED_PENDING_DECISION"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: AppErrorCode;
  /** Extra, client-safe detail (e.g. field-level validation issues). Never put raw DB/internal detail here. */
  readonly detail?: unknown;

  constructor(code: AppErrorCode, message: string, detail?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.detail = detail;
  }
}

/** No authenticated session at all — the caller isn't signed in. */
export class UnauthenticatedError extends AppError {
  constructor(message = "Authentication required.") {
    super("UNAUTHENTICATED", message);
    this.name = "UnauthenticatedError";
  }
}

/** Authenticated, but not allowed to perform this specific action. */
export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.", detail?: unknown) {
    super("FORBIDDEN", message, detail);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super("NOT_FOUND", id ? `${entity} ${id} was not found.` : `${entity} was not found.`);
    this.name = "NotFoundError";
  }
}

/** Input failed shape/business validation before touching the database. */
export class ValidationError extends AppError {
  constructor(message = "Invalid input.", detail?: unknown) {
    super("VALIDATION_ERROR", message, detail);
    this.name = "ValidationError";
  }
}

/** The mutation conflicts with current state (e.g. a UNIQUE constraint, a duplicate assignment). */
export class ConflictError extends AppError {
  constructor(message: string, detail?: unknown) {
    super("CONFLICT", message, detail);
    this.name = "ConflictError";
  }
}

/** A status transition (idea or project) was requested that the canonical workflow does not allow. */
export class InvalidTransitionError extends AppError {
  constructor(message: string, detail?: unknown) {
    super("INVALID_TRANSITION", message, detail);
    this.name = "InvalidTransitionError";
  }
}

/**
 * The requested operation depends on a business rule that is explicitly
 * BLOCKED / PENDING BUSINESS DECISION (see the project status workflow —
 * arbitrary project transitions outside the approved graph). This is
 * intentionally distinct from InvalidTransitionError: it signals "this
 * isn't wrong input, it's a rule nobody has approved yet."
 */
export class BlockedPendingDecisionError extends AppError {
  constructor(message: string, detail?: unknown) {
    super("BLOCKED_PENDING_DECISION", message, detail);
    this.name = "BlockedPendingDecisionError";
  }
}

/** Shape returned to the client by every Server Action / Route Handler on failure. */
export interface ActionErrorResult {
  ok: false;
  code: AppErrorCode;
  message: string;
  detail?: unknown;
}

export interface ActionSuccessResult<T> {
  ok: true;
  data: T;
}

export type ActionResult<T> = ActionSuccessResult<T> | ActionErrorResult;

/**
 * Wrap a service call for use as a Server Action / Route Handler body.
 * Converts a thrown AppError into a typed, client-safe result instead of
 * letting Next.js serialize a raw Error (which would leak a stack trace to
 * the client in some configurations). Anything that isn't an AppError is
 * logged server-side and converted to a generic INTERNAL_ERROR — the
 * client never sees raw internals.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, code: err.code, message: err.message, detail: err.detail };
    }
    console.error("[manarah] unhandled error in action:", err);
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
    };
  }
}

/** HTTP status code a Route Handler should use for a given AppError code. */
export function httpStatusForCode(code: AppErrorCode): number {
  switch (code) {
    case "UNAUTHENTICATED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "VALIDATION_ERROR":
      return 400;
    case "CONFLICT":
      return 409;
    case "INVALID_TRANSITION":
      return 409;
    case "BLOCKED_PENDING_DECISION":
      return 501; // Not Implemented — the rule genuinely doesn't exist yet, not a client error.
    case "INTERNAL_ERROR":
    default:
      return 500;
  }
}
