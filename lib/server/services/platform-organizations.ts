/**
 * Platform-level organization management — Super Admin minimal
 * implementation (Phase 6). Every export here is gated by
 * `requirePlatformAdmin(actor)`, NOT by `requireOrgMembership`/
 * `requirePermission` — a platform admin has zero organization_memberships
 * by construction (see db/migrations/0012_platform_admins.sql), so the
 * org-scoped guards would always reject them, which is exactly the point:
 * platform authority and organization authority are two independent checks,
 * and this file only ever exercises the former.
 *
 * Scope, per the approved implementation instruction: list organizations;
 * view organization metadata (never content — no ideas/projects/
 * evaluations/decisions are read or exposed here); create organization;
 * suspend/reactivate organization; bootstrap an organization's first
 * ORG_ADMIN account. Nothing beyond this file's five capabilities is
 * implemented — no update/edit-organization, no member management, no
 * settings — those were not in the approved scope.
 *
 * STATUS: the fifth capability, `bootstrapOrgAdmin`, is currently BLOCKED —
 * it performs its precondition checks and then deliberately fails with
 * BlockedPendingDecisionError rather than calling Neon Auth. See that
 * function's own doc comment and
 * docs/architecture/manarah-super-admin-bootstrap-blocked-report.md.
 */
import { query, queryOne } from "@/lib/server/db";
import { requirePlatformAdmin } from "@/lib/server/auth/guards";
import { writeAuditLog } from "@/lib/server/audit";
import { NotFoundError, ConflictError, BlockedPendingDecisionError } from "@/lib/server/errors";
import type { Actor } from "@/lib/server/rbac/permissions";

interface OrganizationRow {
  id: string;
  name: string;
  name_en: string | null;
  description: string;
  logo_url: string | null;
  status: "ACTIVE" | "SUSPENDED";
  contact_email: string;
  contact_phone: string;
  sector: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/** Metadata-only summary — matches every column a Super Admin is approved to see for the organizations list. No content (ideas/projects/etc.) is ever joined in. */
export type PlatformOrganizationSummary = Pick<
  OrganizationRow,
  "id" | "name" | "name_en" | "logo_url" | "status" | "sector" | "contact_email" | "contact_phone" | "created_at"
>;

export interface PlatformOrganizationDetail extends PlatformOrganizationSummary {
  description: string;
  updated_at: string;
  /** Count of ACTIVE organization_memberships rows — aggregate metadata, not a member list/content. */
  member_count: number;
  /** Count of ACTIVE organization_memberships rows with role = ORG_ADMIN. */
  admin_count: number;
}

const SUMMARY_COLUMNS =
  "id, name, name_en, logo_url, status, sector, contact_email, contact_phone, created_at";

export async function listAllOrganizations(actor: Actor): Promise<PlatformOrganizationSummary[]> {
  requirePlatformAdmin(actor);
  return query<PlatformOrganizationSummary>(
    `SELECT ${SUMMARY_COLUMNS} FROM organizations ORDER BY created_at DESC`
  );
}

interface MembershipCountRow {
  member_count: string;
  admin_count: string;
}

export async function getOrganizationDetail(
  actor: Actor,
  organizationId: string
): Promise<PlatformOrganizationDetail> {
  requirePlatformAdmin(actor);

  const org = await queryOne<OrganizationRow>(`SELECT * FROM organizations WHERE id = $1`, [organizationId]);
  if (!org) throw new NotFoundError("Organization", organizationId);

  const counts = await queryOne<MembershipCountRow>(
    `
    SELECT
      COUNT(*) FILTER (WHERE membership_status = 'ACTIVE')                       AS member_count,
      COUNT(*) FILTER (WHERE membership_status = 'ACTIVE' AND role = 'ORG_ADMIN') AS admin_count
    FROM organization_memberships
    WHERE organization_id = $1
    `,
    [organizationId]
  );

  return {
    id: org.id,
    name: org.name,
    name_en: org.name_en,
    logo_url: org.logo_url,
    status: org.status,
    sector: org.sector,
    contact_email: org.contact_email,
    contact_phone: org.contact_phone,
    created_at: org.created_at,
    description: org.description,
    updated_at: org.updated_at,
    member_count: Number(counts?.member_count ?? 0),
    admin_count: Number(counts?.admin_count ?? 0),
  };
}

export interface CreatePlatformOrganizationInput {
  name: string;
  nameEn?: string;
  description: string;
  logoUrl?: string;
  contactEmail: string;
  contactPhone: string;
  sector: string;
}

/**
 * There is deliberately no separate "createOrganizationAction" outside the
 * platform-admin surface — before this, no code path in the application
 * could create an organization row at all (confirmed in the Super Admin
 * audit). This is now the ONLY way an organization comes into existence.
 */
export async function createOrganization(
  actor: Actor,
  input: CreatePlatformOrganizationInput
): Promise<PlatformOrganizationDetail> {
  requirePlatformAdmin(actor);

  const row = await queryOne<OrganizationRow>(
    `
    INSERT INTO organizations (name, name_en, description, logo_url, contact_email, contact_phone, sector, created_by, updated_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
    RETURNING *
    `,
    [
      input.name,
      input.nameEn ?? null,
      input.description,
      input.logoUrl ?? null,
      input.contactEmail,
      input.contactPhone,
      input.sector,
      actor.userId,
    ]
  );
  if (!row) throw new ConflictError("Failed to create organization.");

  await writeAuditLog({
    organizationId: row.id,
    actor,
    action: "Organization Created",
    actionAr: "تم إنشاء مؤسسة جديدة",
    entityType: "ORGANIZATION",
    entityId: row.id,
    newState: row.status,
    permissionSnapshot: "PLATFORM:ORG_CREATE",
  });

  return {
    id: row.id,
    name: row.name,
    name_en: row.name_en,
    logo_url: row.logo_url,
    status: row.status,
    sector: row.sector,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    created_at: row.created_at,
    description: row.description,
    updated_at: row.updated_at,
    member_count: 0,
    admin_count: 0,
  };
}

async function setOrganizationStatus(
  actor: Actor,
  organizationId: string,
  toStatus: "ACTIVE" | "SUSPENDED",
  action: string,
  actionAr: string,
  permissionTag: string
): Promise<PlatformOrganizationSummary> {
  requirePlatformAdmin(actor);

  const existing = await queryOne<OrganizationRow>(`SELECT * FROM organizations WHERE id = $1`, [organizationId]);
  if (!existing) throw new NotFoundError("Organization", organizationId);
  if (existing.status === toStatus) {
    throw new ConflictError(
      toStatus === "SUSPENDED" ? "Organization is already suspended." : "Organization is already active."
    );
  }

  const row = await queryOne<OrganizationRow>(
    `UPDATE organizations SET status = $2, updated_at = now(), updated_by = $3 WHERE id = $1 RETURNING *`,
    [organizationId, toStatus, actor.userId]
  );
  if (!row) throw new ConflictError("Failed to update organization status.");

  await writeAuditLog({
    organizationId: row.id,
    actor,
    action,
    actionAr,
    entityType: "ORGANIZATION",
    entityId: row.id,
    previousState: existing.status,
    newState: row.status,
    permissionSnapshot: permissionTag,
  });

  return {
    id: row.id,
    name: row.name,
    name_en: row.name_en,
    logo_url: row.logo_url,
    status: row.status,
    sector: row.sector,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    created_at: row.created_at,
  };
}

/**
 * Suspending an organization does not, by itself, touch
 * organization_memberships, ideas, or projects — every existing org-scoped
 * guard (requireOrgMembership/requirePermission) already reads
 * organizations.status nowhere today, so this is metadata-only until/unless
 * a future phase wires status into those checks. Recorded here explicitly
 * as a known limitation (see the implementation report) rather than
 * silently assumed to cut off access.
 */
export async function suspendOrganization(actor: Actor, organizationId: string): Promise<PlatformOrganizationSummary> {
  return setOrganizationStatus(
    actor,
    organizationId,
    "SUSPENDED",
    "Organization Suspended",
    "تم إيقاف المؤسسة",
    "PLATFORM:ORG_SUSPEND"
  );
}

export async function reactivateOrganization(actor: Actor, organizationId: string): Promise<PlatformOrganizationSummary> {
  return setOrganizationStatus(
    actor,
    organizationId,
    "ACTIVE",
    "Organization Reactivated",
    "تم إعادة تفعيل المؤسسة",
    "PLATFORM:ORG_REACTIVATE"
  );
}

export interface BootstrapOrgAdminInput {
  organizationId: string;
  email: string;
  fullName: string;
}

export interface BootstrapOrgAdminResult {
  userId: string;
  email: string;
  fullName: string;
  organizationId: string;
  /**
   * Returned exactly once, in this response only — there is no email/invite
   * infrastructure in this pass. The platform admin is responsible for
   * relaying this to the new organization admin out of band; it is never
   * logged, stored, or written to audit_logs.
   *
   * NOTE: this shape is currently unreachable — see the doc comment on
   * `bootstrapOrgAdmin` below. It is kept as-is so a future, confirmed-safe
   * implementation is a localized change rather than a redesign.
   */
  temporaryPassword: string;
}

/**
 * BOOTSTRAPPING THE FIRST ORG_ADMIN IS CURRENTLY BLOCKED. Do not remove this
 * block without a supported, confirmed-safe Neon Auth mechanism — see
 * docs/architecture/manarah-super-admin-bootstrap-blocked-report.md and its
 * two predecessor investigations
 * (manarah-super-admin-bootstrap-resolution-investigation.md,
 * manarah-super-admin-bootstrap-live-test-investigation.md).
 *
 * Why: creating the first ORG_ADMIN account requires a real neon_auth.user
 * row, which can only be created through a Neon Auth admin-authenticated
 * API call (`admin.createUser`, or `signUp.email` — both were evaluated).
 * Source-level tracing of @neondatabase/auth's `fetchWithAuth` confirmed
 * that EVERY call made through the SDK's ambient client — regardless of
 * endpoint — forwards the CURRENT request's session cookies upstream and
 * unconditionally stages any `Set-Cookie` the server returns onto the
 * CURRENT outgoing response. There is no supported way to make this call
 * from within a platform admin's own authenticated request without risking
 * that admin's session being overwritten, corrupted, or invalidated by the
 * new user's session. A live empirical test of this could not even be
 * attempted, because this and prior sessions' network egress does not
 * reach the real Neon Auth service host — see the live-test investigation
 * for the reproduced evidence.
 *
 * Given that, this function performs its normal read-only precondition
 * checks (organization exists, is ACTIVE, and has no existing admin —
 * these remain valid business rules independent of the blocker and stay
 * covered by tests) and then deliberately stops. It makes NO call to Neon
 * Auth, and it writes NO row anywhere — not to neon_auth.user (impossible
 * without the blocked call), not to user_profiles, not to
 * organization_memberships. This keeps failure atomic by construction:
 * there is no code path in this function, in its current form, that can
 * create a partial/orphaned local record without a real Neon Auth user
 * behind it, because the local INSERTs simply do not run.
 */
export async function bootstrapOrgAdmin(
  actor: Actor,
  input: BootstrapOrgAdminInput
): Promise<BootstrapOrgAdminResult> {
  requirePlatformAdmin(actor);

  const org = await queryOne<OrganizationRow>(`SELECT * FROM organizations WHERE id = $1`, [input.organizationId]);
  if (!org) throw new NotFoundError("Organization", input.organizationId);
  if (org.status !== "ACTIVE") {
    throw new ConflictError("Cannot bootstrap an administrator for a suspended organization.");
  }

  const existingAdmin = await queryOne<{ id: string }>(
    `
    SELECT id FROM organization_memberships
    WHERE organization_id = $1 AND role = 'ORG_ADMIN' AND membership_status = 'ACTIVE'
    LIMIT 1
    `,
    [input.organizationId]
  );
  if (existingAdmin) {
    throw new ConflictError("This organization already has an active administrator.");
  }

  throw new BlockedPendingDecisionError(
    "Bootstrapping the first organization administrator is not available yet. Creating the account requires a " +
      "Neon Auth admin-authenticated call, and no way to make that call without risking the platform " +
      "administrator's own session has been confirmed safe. See " +
      "docs/architecture/manarah-super-admin-bootstrap-blocked-report.md for the full investigation."
  );
}
