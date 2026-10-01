/**
 * Maps an already-resolved `Actor` to the route their session should land
 * on — the root page (`app/page.tsx`) and the shared login page
 * (`app/login/page.tsx`) both consume this so there is exactly one place
 * that decides "which interface does this person belong in."
 *
 * Deliberately pure and synchronous: it never calls `getCurrentActor()`
 * itself (see `lib/server/actions/routing.ts` for the Server Action that
 * does), so it needs no mocking to test and can be reused from both a
 * Server Component and a Server Action.
 */
import type { Actor } from "@/lib/server/rbac/permissions";

export type HomeRoute =
  | { kind: "REDIRECT"; path: string }
  | { kind: "ACCESS_DENIED" }
  | { kind: "ANONYMOUS" };

export function resolveHomeRoute(actor: Actor | null): HomeRoute {
  if (!actor) return { kind: "ANONYMOUS" };

  if (actor.isPlatformAdmin) {
    return { kind: "REDIRECT", path: "/super-admin" };
  }

  const role = actor.memberships[0]?.role;
  switch (role) {
    case "ORG_ADMIN":
      return { kind: "REDIRECT", path: "/org/dashboard" };
    case "INNOVATION_SPECIALIST":
      return { kind: "REDIRECT", path: "/innovation-specialist/dashboard" };
    case "INTERNAL_INNOVATOR":
    case "EXTERNAL_INNOVATOR":
      return { kind: "REDIRECT", path: "/innovator/dashboard" };
    default:
      return { kind: "ACCESS_DENIED" };
  }
}
