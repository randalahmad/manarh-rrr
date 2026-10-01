import type { ActionResult } from "@/lib/server/errors";

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
