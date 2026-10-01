import type { Actor } from "@/lib/server/rbac/permissions";

export type HomeRoute =
  | { kind: "REDIRECT"; path: string }
  | { kind: "ACCESS_DENIED" }
  | { kind: "ANONYMOUS" };

export function resolveHomeRoute(actor: Actor | null): HomeRoute {
  if (!actor) return { kind: "ANONYMOUS" };
  if (actor.isPlatformAdmin) return { kind: "REDIRECT", path: "/super-admin" };

  const role = actor.memberships[0]?.role;
  switch (role) {
    case "ORG_ADMIN":
    case "EVALUATOR":
    case "PROJECT_MANAGER":
      return { kind: "REDIRECT", path: "/org/dashboard" };
    case "INNOVATION_SPECIALIST":
      return { kind: "REDIRECT", path: "/innovation-specialist/dashboard" };
    case "INTERNAL_INNOVATOR":
    case "EXTERNAL_INNOVATOR":
      return { kind: "REDIRECT", path: "/innovator" };
    default:
      return { kind: "ACCESS_DENIED" };
  }
}
