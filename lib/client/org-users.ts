/**
 * Client-side data layer for the Org Admin Users pages
 * (`app/org/users/page.tsx`, `app/org/users/[id]/page.tsx`).
 *
 * "Add user" / "resend invitation" are intentionally NOT exposed here —
 * see lib/server/services/org-users.ts's header for why (same session-
 * hijack risk already investigated and blocked for bootstrapOrgAdmin()).
 * `userType` has no real column (the role enum already distinguishes
 * INTERNAL_INNOVATOR/EXTERNAL_INNOVATOR from staff roles) — derived here,
 * not stored. `jobTitle` has no real column either — always undefined.
 */
import type { User, UserRole, AccountStatus, UserType } from "@/lib/types";
import {
  listOrgMembersAction,
  getOrgMemberAction,
  updateOrgMembershipAction,
  setMemberAccountStatusAction,
} from "@/lib/server/actions/org-users";
import type { OrgMemberRow } from "@/lib/server/services/org-users";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

function deriveUserType(role: UserRole): UserType {
  if (role === "EXTERNAL_INNOVATOR") return "EXTERNAL_INNOVATOR";
  if (role === "INTERNAL_INNOVATOR") return "INNOVATOR";
  return "ORG_USER";
}

function mapMemberRow(row: OrgMemberRow): User {
  return {
    id: row.user_id,
    organizationId: row.organization_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    userType: deriveUserType(row.role),
    role: row.role,
    department: row.department ?? undefined,
    status: row.account_status,
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at ?? undefined,
    ideasSubmitted: row.ideas_submitted,
    ideasApproved: row.ideas_approved,
    projectsInvolved: row.projects_involved,
  };
}

export async function fetchOrgMembers(organizationId: string): Promise<User[]> {
  const rows = unwrap(await listOrgMembersAction({ organizationId }));
  return rows.map(mapMemberRow);
}

export async function fetchOrgMember(organizationId: string, userId: string): Promise<User> {
  return mapMemberRow(unwrap(await getOrgMemberAction({ organizationId, userId })));
}

export async function updateOrgMember(
  organizationId: string,
  userId: string,
  patch: { role?: UserRole; department?: string | null }
): Promise<User> {
  return mapMemberRow(unwrap(await updateOrgMembershipAction({ organizationId, userId, ...patch })));
}

export async function setOrgMemberStatus(
  organizationId: string,
  userId: string,
  status: AccountStatus,
  reason?: string
): Promise<User> {
  return mapMemberRow(unwrap(await setMemberAccountStatusAction({ organizationId, userId, status, reason })));
}
