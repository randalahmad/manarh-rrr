/**
 * Org Admin Users management — the Users list/detail pages
 * (`app/org/users/page.tsx`, `app/org/users/[id]/page.tsx`).
 *
 * Deliberately does NOT implement "add/invite a new user": creating a real
 * Neon Auth account from a Server Action would call the same
 * `auth.signUp.email()` path already investigated and left disabled for
 * `bootstrapOrgAdmin()` (lib/server/services/platform-organizations.ts) —
 * it forwards the CURRENT request's session cookies with no confirmed-safe
 * isolation, risking hijacking the calling admin's own session. Since that
 * exact risk was already raised, reviewed, and deliberately left blocked
 * for a structurally identical operation, inventing a second, unreviewed
 * code path here that does the same unsafe thing would contradict that
 * decision rather than respect it. Only mutations on an EXISTING member
 * (role, department, account status) are implemented — plain UPDATE
 * statements with no Neon Auth account-creation involved.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requirePermission, requireOrgMembership } from "@/lib/server/auth/guards";
import { NotFoundError, ConflictError } from "@/lib/server/errors";
import { auditLogStatement } from "@/lib/server/audit";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { AccountStatus, UserRole } from "@/lib/types";

export interface OrgMemberRow {
  membership_id: string;
  user_id: string;
  organization_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  membership_status: "ACTIVE" | "INACTIVE";
  department: string | null;
  account_status: AccountStatus;
  ideas_submitted: number;
  ideas_approved: number;
  projects_involved: number;
  last_activity_at: string | null;
  created_at: string;
}

const MEMBER_SELECT = `
  SELECT
    om.id AS membership_id, om.user_id, om.organization_id, om.role, om.membership_status, om.department, om.created_at,
    u.email, u.name AS full_name, u.image AS auth_image,
    up.avatar_url, up.phone, up.status AS account_status, up.ideas_submitted, up.ideas_approved, up.projects_involved, up.last_activity_at
  FROM organization_memberships om
  JOIN neon_auth.user u ON u.id = om.user_id
  LEFT JOIN user_profiles up ON up.id = om.user_id
`;

interface RawMemberRow extends Omit<OrgMemberRow, "avatar_url" | "account_status" | "ideas_submitted" | "ideas_approved" | "projects_involved"> {
  auth_image: string | null;
  avatar_url: string | null;
  account_status: AccountStatus | null;
  ideas_submitted: number | null;
  ideas_approved: number | null;
  projects_involved: number | null;
}

function normalizeMember(row: RawMemberRow): OrgMemberRow {
  return {
    ...row,
    avatar_url: row.avatar_url ?? row.auth_image,
    account_status: row.account_status ?? "PENDING_ACTIVATION",
    ideas_submitted: row.ideas_submitted ?? 0,
    ideas_approved: row.ideas_approved ?? 0,
    projects_involved: row.projects_involved ?? 0,
  };
}

export async function listOrgMembers(actor: Actor, organizationId: string): Promise<OrgMemberRow[]> {
  requirePermission(actor, organizationId, "USER", "VIEW");
  const rows = await query<RawMemberRow>(
    `${MEMBER_SELECT} WHERE om.organization_id = $1 ORDER BY om.created_at DESC`,
    [organizationId]
  );
  return rows.map(normalizeMember);
}

export async function getOrgMember(actor: Actor, membershipId: string): Promise<OrgMemberRow> {
  const row = await queryOne<RawMemberRow>(`${MEMBER_SELECT} WHERE om.id = $1`, [membershipId]);
  if (!row) throw new NotFoundError("Membership", membershipId);
  requireOrgMembership(actor, row.organization_id);
  requirePermission(actor, row.organization_id, "USER", "VIEW");
  return normalizeMember(row);
}

/** organization_memberships has UNIQUE(user_id, organization_id), so a user
 * id is an unambiguous lookup key within one organization's member list —
 * this is what the Users list/detail pages route on (the same shape the
 * mock's `User.id` already had), rather than the internal membership id. */
export async function getOrgMemberByUserId(actor: Actor, organizationId: string, userId: string): Promise<OrgMemberRow> {
  const row = await queryOne<RawMemberRow>(`${MEMBER_SELECT} WHERE om.organization_id = $1 AND om.user_id = $2`, [
    organizationId,
    userId,
  ]);
  if (!row) throw new NotFoundError("Membership", userId);
  requireOrgMembership(actor, row.organization_id);
  requirePermission(actor, row.organization_id, "USER", "VIEW");
  return normalizeMember(row);
}

export interface UpdateMembershipInput {
  role?: UserRole;
  department?: string | null;
}

export async function updateOrgMembership(
  actor: Actor,
  membershipId: string,
  patch: UpdateMembershipInput
): Promise<OrgMemberRow> {
  const existing = await queryOne<{ organization_id: string }>(
    `SELECT organization_id FROM organization_memberships WHERE id = $1`,
    [membershipId]
  );
  if (!existing) throw new NotFoundError("Membership", membershipId);
  requirePermission(actor, existing.organization_id, "USER", "MANAGE");

  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.role !== undefined) {
    params.push(patch.role);
    sets.push(`role = $${params.length}`);
  }
  if (patch.department !== undefined) {
    params.push(patch.department);
    sets.push(`department = $${params.length}`);
  }
  if (sets.length === 0) return getOrgMember(actor, membershipId);

  params.push(membershipId);
  const [rows] = await transaction<[{ id: string }[], unknown[]]>([
    { sql: `UPDATE organization_memberships SET ${sets.join(", ")}, updated_at = now() WHERE id = $${params.length} RETURNING id`, params },
    auditLogStatement({
      organizationId: existing.organization_id,
      actor,
      action: "User Membership Updated",
      actionAr: "تعديل عضوية مستخدم",
      entityType: "USER",
      entityId: membershipId,
      permissionSnapshot: "USER:MANAGE",
    }),
  ]);
  if (!rows[0]) throw new ConflictError("Membership update did not apply.");
  return getOrgMember(actor, membershipId);
}

export async function setMemberAccountStatus(
  actor: Actor,
  membershipId: string,
  status: AccountStatus,
  reason?: string
): Promise<OrgMemberRow> {
  const existing = await queryOne<{ organization_id: string; user_id: string }>(
    `SELECT organization_id, user_id FROM organization_memberships WHERE id = $1`,
    [membershipId]
  );
  if (!existing) throw new NotFoundError("Membership", membershipId);
  requirePermission(actor, existing.organization_id, "USER", "EDIT");

  await transaction([
    {
      sql: `
        INSERT INTO user_profiles (id, status, status_reason)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, status_reason = EXCLUDED.status_reason, updated_at = now()
      `,
      params: [existing.user_id, status, reason ?? null],
    },
    auditLogStatement({
      organizationId: existing.organization_id,
      actor,
      action: "User Status Changed",
      actionAr: "تغيير حالة حساب مستخدم",
      entityType: "USER",
      entityId: membershipId,
      newState: status,
      decisionDetails: reason ?? null,
      permissionSnapshot: "USER:EDIT",
    }),
  ]);

  return getOrgMember(actor, membershipId);
}
