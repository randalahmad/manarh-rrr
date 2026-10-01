/**
 * Client-side data layer for the Org Admin Roles & Permissions page
 * (`app/org/roles-permissions/page.tsx`).
 */
import type { Role, Permission } from "@/lib/types";
import { listOrgRolesAction } from "@/lib/mock-server/actions/org-roles";
import type { RoleWithPermissions, RolePermissionEntry } from "@/lib/server/services/org-roles";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

function mapPermission(row: RolePermissionEntry): Permission {
  return {
    id: row.id,
    area: row.area,
    action: row.action,
    actionAr: row.note ?? `${row.area}:${row.action}`,
    scope: { type: row.scope_type },
    note: row.note ?? undefined,
  };
}

function mapRole(row: RoleWithPermissions): Role {
  return {
    id: row.id,
    name: row.name,
    nameAr: row.name_ar,
    description: row.description,
    isSystem: row.is_system,
    userCount: row.user_count,
    permissions: row.permissions.map(mapPermission),
  };
}

export async function fetchOrgRoles(organizationId: string): Promise<Role[]> {
  const rows = unwrap(await listOrgRolesAction({ organizationId }));
  return rows.map(mapRole);
}
