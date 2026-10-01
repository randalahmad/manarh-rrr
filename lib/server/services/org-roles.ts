/**
 * Roles & Permissions catalog for the Org Admin Roles & Permissions page
 * (`app/org/roles-permissions/page.tsx`), which is read-only in the mock
 * too (it displays each role's fixed permission set — there is no
 * "edit a role's permissions" UI to wire up). Reads the real, already-seeded
 * `roles`/`permissions`/`role_permissions` catalog (db/migrations/0010)
 * plus a per-role active-member count scoped to this organization. Gated by
 * USER:VIEW (viewing roles is part of viewing the user/role model).
 */
import { query } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth/guards";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { PermissionArea, PermissionAction } from "@/lib/server/rbac/permissions";

export interface RolePermissionEntry {
  id: string;
  area: PermissionArea;
  action: PermissionAction;
  scope_type: "SYSTEM" | "ORGANIZATION" | "DEPARTMENT" | "TEAM" | "PROJECT" | "IDEA";
  note: string | null;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  is_system: boolean;
  system_role_key: string | null;
  user_count: number;
  permissions: RolePermissionEntry[];
}

export async function listRolesWithPermissions(actor: Actor, organizationId: string): Promise<RoleWithPermissions[]> {
  requirePermission(actor, organizationId, "USER", "VIEW");

  const [roles, permissionRows, memberCounts] = await Promise.all([
    query<{ id: string; name: string; name_ar: string; description: string; is_system: boolean; system_role_key: string | null }>(
      `SELECT id, name, name_ar, description, is_system, system_role_key FROM roles ORDER BY is_system DESC, name_ar ASC`
    ),
    query<{ role_id: string; id: string; area: PermissionArea; action: PermissionAction; scope_type: RolePermissionEntry["scope_type"]; note: string | null }>(
      `SELECT rp.role_id, p.id, p.area, p.action, p.scope_type, p.note
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id`
    ),
    query<{ role: string; count: string }>(
      `SELECT role::text AS role, COUNT(*)::text AS count
       FROM organization_memberships
       WHERE organization_id = $1 AND membership_status = 'ACTIVE'
       GROUP BY role`,
      [organizationId]
    ),
  ]);

  const permissionsByRole = new Map<string, RolePermissionEntry[]>();
  for (const row of permissionRows) {
    permissionsByRole.set(row.role_id, [
      ...(permissionsByRole.get(row.role_id) ?? []),
      { id: row.id, area: row.area, action: row.action, scope_type: row.scope_type, note: row.note },
    ]);
  }

  const countByRoleKey = new Map(memberCounts.map((r) => [r.role, Number(r.count)]));

  return roles.map((r) => ({
    ...r,
    user_count: r.system_role_key ? (countByRoleKey.get(r.system_role_key) ?? 0) : 0,
    permissions: permissionsByRole.get(r.id) ?? [],
  }));
}
