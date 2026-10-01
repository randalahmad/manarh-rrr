"use server";

/**
 * A single, additive Server Action: "given the current session, where
 * should this person land?" It composes two already-tested, unmodified
 * primitives — `getCurrentActor()` (lib/server/auth/session.ts) and
 * `resolveHomeRoute()` (lib/server/routing/home-route.ts) — rather than
 * extending the existing `signInAction`/`SessionUser` shape in
 * lib/server/actions/auth.ts, which does not carry `isPlatformAdmin` and is
 * intentionally left unmodified.
 */
import { getCurrentActor } from "@/lib/server/auth/session";
import { resolveHomeRoute, type HomeRoute } from "@/lib/server/routing/home-route";
import { runAction, type ActionResult } from "@/lib/server/errors";

export async function resolveMyHomeRouteAction(): Promise<ActionResult<HomeRoute>> {
  return runAction(async () => resolveHomeRoute(await getCurrentActor()));
}
