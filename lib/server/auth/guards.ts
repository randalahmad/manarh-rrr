/**
 * Authentication / authorization guards — the functions every Server
 * Action and Route Handler calls FIRST, before touching the database.
 *
 * Ordering matters and is enforced by composition: `requirePermission`
 * calls `requireOrgMembership`, which requires an `Actor`, which only
 * exists if `requireActiveUser`/`requireActor` succeeded. A service that
 * calls `requirePermission(...)` as its first line has authorization
 * BEFORE any mutation by construction — there is no code path that
 * reaches a `db.query` write without having passed through here first, as
 * long as services follow the pattern (checked in the Phase 5 report's
 * "server-side validation for every mutation" section).
 */
import { getCurrentActor, getCurrentUserProfile } from "./session";
import { UnauthenticatedError, ForbiddenError } from "@/lib/server/errors";
import {
  hasPermission,
  membershipFor,
  type Actor,
  type ActorMembership,
  type PermissionArea,
  type PermissionAction,
} from "@/lib/server/rbac/permissions";

/** Require a valid session. Does not check account activation status — use `requireActiveUser` for mutations. */
export async function requireActor(): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) throw new UnauthenticatedError();
  return actor;
}

/**
 * Require a valid session AND an ACTIVE user_profiles.status. Every
 * mutation-performing Server Action should use this (or a guard built on
 * it), not `requireActor` alone — a signed-in-but-suspended or
 * not-yet-activated account must not be able to write data.
 */
export async function requireActiveUser(): Promise<Actor> {
  const actor = await requireActor();
  const profile = await getCurrentUserProfile(actor.userId);
  if (!profile) {
    throw new ForbiddenError("Your account profile has not been provisioned yet.");
  }
  if (profile.status !== "ACTIVE") {
    throw new ForbiddenError(`Your account is not active (status: ${profile.status}).`);
  }
  return actor;
}

/** Require the actor to have an ACTIVE membership in `organizationId`. This is the org-isolation boundary — every org-scoped read/write must call this (directly or via requirePermission) before touching a row. */
export function requireOrgMembership(actor: Actor, organizationId: string): ActorMembership {
  const membership = membershipFor(actor, organizationId);
  if (!membership) {
    throw new ForbiddenError("You are not a member of this organization.");
  }
  return membership;
}

/** Require org membership AND the specific (area, action) permission. Returns the membership so callers can branch on `.role` without a second lookup. */
export function requirePermission(
  actor: Actor,
  organizationId: string,
  area: PermissionArea,
  action: PermissionAction
): ActorMembership {
  const membership = requireOrgMembership(actor, organizationId);
  if (!hasPermission(actor, organizationId, area, action)) {
    throw new ForbiddenError(`Missing permission ${area}:${action} in this organization.`, {
      area,
      action,
      organizationId,
    });
  }
  return membership;
}

/** Require the actor to hold one of the given roles within `organizationId` (in addition to being a member). Use for checks that aren't naturally a (area, action) permission — e.g. "must be the assigned evaluator or an org admin." */
export function requireRole(
  actor: Actor,
  organizationId: string,
  allowedRoles: readonly ActorMembership["role"][]
): ActorMembership {
  const membership = requireOrgMembership(actor, organizationId);
  if (!allowedRoles.includes(membership.role)) {
    throw new ForbiddenError(
      `This action requires one of: ${allowedRoles.join(", ")}.`,
      { requiredRoles: allowedRoles, actualRole: membership.role }
    );
  }
  return membership;
}

/**
 * Require the actor to be a platform administrator — completely
 * independent of `organizationId`/`organization_memberships`. Mirrors
 * `requireOrgMembership`'s shape exactly (sync check on an already-built
 * Actor, throws ForbiddenError, returns the actor for convenience) but
 * checks `actor.isPlatformAdmin` (resolved once by `getCurrentActor()`
 * from the dedicated `platform_admins` table — see
 * db/migrations/0012_platform_admins.sql) instead of any membership.
 *
 * Deliberately does NOT accept an `organizationId` parameter — a platform
 * admin's authorization is not scoped to one organization, and there is no
 * (area, action) permission consulted here (SUPER_ADMIN has no
 * `roles`/`role_permissions` catalog rows by design). Fail-closed:
 * `actor.isPlatformAdmin` defaults to falsy (both `false` and the
 * `undefined` that older/test-built Actor values may carry) unless
 * `getCurrentActor()` found an active `platform_admins` row.
 *
 * Passing this check proves ONLY platform-admin status — it does not by
 * itself grant access to any organization-scoped data. Every existing
 * org-scoped guard (`requireOrgMembership`, `requirePermission`, ...)
 * still requires its own membership row exactly as before; a platform
 * admin with zero organization_memberships still cannot pass those checks,
 * by construction, with no special case added for SUPER_ADMIN anywhere in
 * this file.
 */
export function requirePlatformAdmin(actor: Actor): Actor {
  if (!actor.isPlatformAdmin) {
    throw new ForbiddenError("Platform administrator access required.");
  }
  return actor;
}
