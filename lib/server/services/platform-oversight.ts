/**
 * Platform oversight — aggregate, metadata-only statistics for Super Admin
 * (Phase 6). Every number here is a COUNT(*) over existing tables; nothing
 * in this file ever selects idea/project/evaluation/decision content, and
 * nothing here is organization-scoped (no requireOrgMembership anywhere) —
 * gated purely by requirePlatformAdmin(), matching the approved "Platform
 * Oversight" capability: "number of organizations; active/suspended
 * organization counts; other aggregate platform statistics that can be
 * derived safely from existing data."
 */
import { queryOne } from "@/lib/server/db";
import { requirePlatformAdmin } from "@/lib/server/auth/guards";
import type { Actor } from "@/lib/server/rbac/permissions";

export interface PlatformStats {
  organizationCount: number;
  activeOrganizationCount: number;
  suspendedOrganizationCount: number;
  platformAdminCount: number;
}

interface OrgCountRow {
  total: string;
  active: string;
  suspended: string;
}

interface AdminCountRow {
  total: string;
}

export async function getPlatformStats(actor: Actor): Promise<PlatformStats> {
  requirePlatformAdmin(actor);

  const [orgCounts, adminCounts] = await Promise.all([
    queryOne<OrgCountRow>(
      `
      SELECT
        COUNT(*)                                   AS total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')    AS active,
        COUNT(*) FILTER (WHERE status = 'SUSPENDED') AS suspended
      FROM organizations
      `
    ),
    queryOne<AdminCountRow>(`SELECT COUNT(*) AS total FROM platform_admins WHERE is_active = true`),
  ]);

  return {
    organizationCount: Number(orgCounts?.total ?? 0),
    activeOrganizationCount: Number(orgCounts?.active ?? 0),
    suspendedOrganizationCount: Number(orgCounts?.suspended ?? 0),
    platformAdminCount: Number(adminCounts?.total ?? 0),
  };
}
