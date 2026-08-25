/**
 * RBAC — permission model and pure authorization predicate.
 *
 * Mirrors the canonical PermissionArea / PermissionAction taxonomy already
 * approved in lib/types.ts and implemented as real DB tables in Phase 4
 * (`permissions`, `role_permissions`) and seeded in Phase 5's
 * `db/migrations/0010_rbac_seed.sql` from the exact grants already in use
 * in `lib/mock-data/seed.ts`.
 *
 * `hasPermission()` is a pure function — no I/O — so it's fully unit
 * testable without a database. The caller (Actor resolution in
 * lib/server/auth/session.ts) is responsible for loading the actor's
 * granted (area, action) pairs from the database ONCE per request and
 * attaching them to the Actor; this function just consults that in-memory
 * set plus the one explicit special case that matches the existing mock's
 * `can()` behavior exactly (see below).
 */
import type { PermissionAction, PermissionArea } from "@/lib/types";

export type { PermissionAction, PermissionArea };

export interface GrantedPermission {
  area: PermissionArea;
  action: PermissionAction;
}

/**
 * The minimum an authorization check needs to know about the caller.
 * Built once per request by `resolveActor()` (lib/server/auth/session.ts).
 */
export interface Actor {
  userId: string;
  email: string;
  /** Every organization the user has an ACTIVE membership in, each with its OWN role and grant set — a user with different roles in different organizations must not have one org's grants leak into another. */
  memberships: ActorMembership[];
  /**
   * True only if `platform_admins` has an active row for this user —
   * completely independent of `memberships`/`organization_memberships`.
   * Resolved once by `getCurrentActor()` (lib/server/auth/session.ts), the
   * same place `memberships` is resolved, so every guard/service sees a
   * fully-built Actor with no further I/O needed.
   *
   * Optional (not required) so every existing test fixture that builds an
   * `Actor` literal without this field keeps compiling — and, more
   * importantly, so an absent field is indistinguishable from `false`:
   * `requirePlatformAdmin()` checks `!actor.isPlatformAdmin`, which is
   * fail-closed for `undefined` exactly the same as for `false`.
   *
   * This is deliberately NOT part of the (area, action) permission catalog
   * — SUPER_ADMIN has no `roles`/`role_permissions` rows (see
   * db/migrations/0010_rbac_seed.sql and 0012_platform_admins.sql) and
   * `hasPermission()` never consults this field. Platform-scoped actions
   * are gated by `requirePlatformAdmin()` (lib/server/auth/guards.ts)
   * instead, checked independently of everything below.
   */
  isPlatformAdmin?: boolean;
}

export interface ActorMembership {
  membershipId: string;
  organizationId: string;
  role:
    | "SUPER_ADMIN"
    | "ORG_ADMIN"
    | "INNOVATION_SPECIALIST"
    | "INTERNAL_INNOVATOR"
    | "EXTERNAL_INNOVATOR"
    | "EVALUATOR"
    | "PROJECT_MANAGER";
  /** (area, action) pairs granted to `role`, scoped to THIS membership's organization only. Empty for a role with no seeded role_permissions rows (e.g. SUPER_ADMIN, ORG_ADMIN — see isOrgAdmin). */
  grants: GrantedPermission[];
}

/**
 * True if `actor` has an ACTIVE membership in `organizationId` with role
 * `ORG_ADMIN`. Mirrors lib/store.tsx's `can()`, which special-cases
 * ORG_ADMIN to always return true rather than consulting a permission
 * list — see db/migrations/0010_rbac_seed.sql's header note. Kept as one
 * named function (not inlined) so the special case is easy to find and
 * can't silently drift from the migration comment that documents it.
 */
export function isOrgAdmin(actor: Actor, organizationId: string): boolean {
  return actor.memberships.some(
    (m) => m.organizationId === organizationId && m.role === "ORG_ADMIN"
  );
}

/**
 * True if `actor` has an ACTIVE membership in `organizationId` at all,
 * regardless of role. The foundation of organization-scoped data access:
 * every service that reads/writes org-scoped data must call this (or
 * `requireOrgMembership` in lib/server/auth/guards.ts) before touching
 * the row, so a user can never reach another organization's data by
 * guessing an id.
 */
export function isOrgMember(actor: Actor, organizationId: string): boolean {
  return actor.memberships.some((m) => m.organizationId === organizationId);
}

export function membershipFor(actor: Actor, organizationId: string): ActorMembership | undefined {
  return actor.memberships.find((m) => m.organizationId === organizationId);
}

/**
 * Core permission predicate. ORG_ADMIN within `organizationId` always
 * passes (see isOrgAdmin). Everyone else must both (a) be an active
 * member of `organizationId`, and (b) have the (area, action) pair in
 * their flattened grant set.
 *
 * This does NOT check organization membership on its own for non-admins
 * beyond requiring *a* membership in the target org — callers still need
 * to separately verify the actor is allowed to touch the SPECIFIC entity
 * (e.g. "is this evaluator the one actually assigned to this idea") via
 * the relevant service's own ownership check. Permission checks answer
 * "is this class of action allowed for this role in this org", not "is
 * this specific row theirs."
 */
export function hasPermission(
  actor: Actor,
  organizationId: string,
  area: PermissionArea,
  action: PermissionAction
): boolean {
  const membership = membershipFor(actor, organizationId);
  if (!membership) return false;
  if (membership.role === "ORG_ADMIN") return true;
  return membership.grants.some((g) => g.area === area && g.action === action);
}

/** Throws-on-failure convenience wrapper — see lib/server/auth/guards.ts's `requirePermission` for the version services should actually call. */
export function assertPermission(
  actor: Actor,
  organizationId: string,
  area: PermissionArea,
  action: PermissionAction
): void {
  if (!hasPermission(actor, organizationId, area, action)) {
    throw new PermissionDeniedError(area, action);
  }
}

export class PermissionDeniedError extends Error {
  readonly area: PermissionArea;
  readonly action: PermissionAction;
  constructor(area: PermissionArea, action: PermissionAction) {
    super(`Missing permission ${area}:${action}.`);
    this.name = "PermissionDeniedError";
    this.area = area;
    this.action = action;
  }
}
