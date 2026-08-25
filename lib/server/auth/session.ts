/**
 * Resolves the current request's Neon Auth session into an `Actor` — the
 * shape every guard, permission check, and service function operates on.
 *
 * This is the ONLY place that turns "a signed cookie" into "a set of
 * organizations and permissions this person actually has right now." It
 * always re-reads `organization_memberships`, `role_permissions`, and
 * `platform_admins` from the database rather than trusting anything
 * client-supplied, per the architecture's Server Actions guidance:
 * "re-derive ownership from a trusted source using the session," never
 * from caller input.
 *
 * Call `getCurrentActor()` from a Server Action, Route Handler, or guard —
 * never cache the result across requests.
 */
import { getAuth } from "./neon-auth";
import { query } from "@/lib/server/db";
import type { Actor, ActorMembership } from "@/lib/server/rbac/permissions";
import type { AccountStatus } from "@/lib/types";

interface MembershipRow {
  membership_id: string;
  organization_id: string;
  role: ActorMembership["role"];
  area: string | null;
  action: string | null;
}

interface ProfileRow {
  status: AccountStatus;
}

interface PlatformAdminRow {
  user_id: string;
}

/**
 * Returns the resolved Actor for the current request, or `null` if there
 * is no valid Neon Auth session. Does NOT check account status — callers
 * that need an active, non-suspended user should use
 * `requireUser`/`requireActiveUser` in guards.ts, which layer that check
 * on top of this.
 */
export async function getCurrentActor(): Promise<Actor | null> {
  const auth = getAuth();
  const { data: session } = await auth.getSession();
  if (!session?.user) return null;

  const userId = session.user.id;

  // Resolved independently of, and in parallel with, organization
  // membership — platform_admins carries no organization_id at all (see
  // db/migrations/0012_platform_admins.sql). A missing/inactive row here
  // simply means isPlatformAdmin stays false; it never affects, and is
  // never affected by, the membership query below.
  const [rows, platformAdminRows] = await Promise.all([
    query<MembershipRow>(
      `
      SELECT
        om.id            AS membership_id,
        om.organization_id,
        om.role,
        p.area,
        p.action
      FROM organization_memberships om
      LEFT JOIN roles r
        ON r.system_role_key = om.role
      LEFT JOIN role_permissions rp
        ON rp.role_id = r.id
      LEFT JOIN permissions p
        ON p.id = rp.permission_id
      WHERE om.user_id = $1
        AND om.membership_status = 'ACTIVE'
      `,
      [userId]
    ),
    query<PlatformAdminRow>(
      `SELECT user_id FROM platform_admins WHERE user_id = $1 AND is_active = true`,
      [userId]
    ),
  ]);

  const byMembership = new Map<string, ActorMembership>();
  for (const row of rows) {
    let membership = byMembership.get(row.membership_id);
    if (!membership) {
      membership = {
        membershipId: row.membership_id,
        organizationId: row.organization_id,
        role: row.role,
        grants: [],
      };
      byMembership.set(row.membership_id, membership);
    }
    if (row.area && row.action) {
      membership.grants.push({
        area: row.area as ActorMembership["grants"][number]["area"],
        action: row.action as ActorMembership["grants"][number]["action"],
      });
    }
  }

  return {
    userId,
    email: session.user.email,
    memberships: Array.from(byMembership.values()),
    isPlatformAdmin: platformAdminRows.length > 0,
  };
}

/**
 * Loads the Manarah-specific profile extension (user_profiles) for the
 * current session's user, if any. Separate from getCurrentActor() because
 * most authorization checks don't need it — only flows that care about
 * account activation status (e.g. blocking a PENDING_ACTIVATION or
 * SUSPENDED account) do.
 */
export async function getCurrentUserProfile(userId: string): Promise<ProfileRow | null> {
  const rows = await query<ProfileRow>(
    `SELECT status FROM user_profiles WHERE id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

export interface SessionIdentity {
  userId: string;
  email: string;
  /** From neon_auth.user.name (Better Auth's own identity field). */
  name: string | null;
  /** From neon_auth.user.image (Better Auth's own identity field) — Manarah's own user_profiles.avatar_url takes precedence where a caller needs a display avatar; see getCurrentActor's callers. */
  image: string | null;
}

/**
 * Reads just the identity fields off the current Neon Auth session, with no
 * RBAC/organization resolution — cheaper than getCurrentActor() for callers
 * that only need "who is signed in and what's their display name", such as
 * the auth Server Actions (lib/server/actions/auth.ts) that build a
 * client-safe session-user payload after sign-in. Returns null if there is
 * no valid session.
 */
export async function getCurrentSessionIdentity(): Promise<SessionIdentity | null> {
  const auth = getAuth();
  const { data: session } = await auth.getSession();
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  };
}
