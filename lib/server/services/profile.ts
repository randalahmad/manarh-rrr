/**
 * Self-service profile read/update — shared by every interface's Profile
 * page (Org Admin, Innovation Specialist, Innovator), since they all read
 * and write the same `user_profiles` extension row. Deliberately never
 * touches `neon_auth.user` (name/email) — that table belongs to Neon Auth
 * itself, i.e. "Authentication logic", out of scope to modify. Only the
 * app's own `user_profiles` extension row is written, and only for the
 * CALLING user's own id (`actor.userId` — never a target id parameter), so
 * no authorization check beyond "is signed in" is needed: a user can
 * always edit their own profile. `employmentStatus`/`organizationName`/
 * `specialization` are Innovator-facing columns (see
 * db/migrations/0002_identity_and_access.sql) — harmless, always-null
 * no-ops for any other role.
 */
import { query, transaction } from "@/lib/server/db";
import { auditLogStatement } from "@/lib/server/audit";
import type { Actor } from "@/lib/server/rbac/permissions";

export interface UpdateOwnProfileInput {
  phone?: string | null;
  bio?: string | null;
  /** Innovator-facing only (db/migrations/0002_identity_and_access.sql) — harmless no-op column for any other role. */
  employmentStatus?: "STUDENT" | "EMPLOYED" | "JOB_SEEKER" | null;
  organizationName?: string | null;
  specialization?: string | null;
}

export interface OwnProfileRow {
  phone: string | null;
  bio: string | null;
  employment_status: "STUDENT" | "EMPLOYED" | "JOB_SEEKER" | null;
  organization_name: string | null;
  specialization: string | null;
}

/**
 * Read side of the same self-only `user_profiles` extension row
 * `updateOwnProfile` writes to. No authorization check beyond "is signed
 * in," same reasoning as the write path: a user can always read their own
 * profile. Returns nulls (never a throw) for a user who has never saved a
 * profile extension yet — the row may not exist.
 */
export async function getOwnProfile(actor: Actor): Promise<OwnProfileRow> {
  const row = await query<OwnProfileRow>(
    `SELECT phone, bio, employment_status, organization_name, specialization FROM user_profiles WHERE id = $1`,
    [actor.userId]
  );
  return row[0] ?? { phone: null, bio: null, employment_status: null, organization_name: null, specialization: null };
}

export async function updateOwnProfile(actor: Actor, patch: UpdateOwnProfileInput): Promise<void> {
  const columns: string[] = [];
  const params: unknown[] = [actor.userId];
  if (patch.phone !== undefined) {
    columns.push("phone");
    params.push(patch.phone);
  }
  if (patch.bio !== undefined) {
    columns.push("bio");
    params.push(patch.bio);
  }
  if (patch.employmentStatus !== undefined) {
    columns.push("employment_status");
    params.push(patch.employmentStatus);
  }
  if (patch.organizationName !== undefined) {
    columns.push("organization_name");
    params.push(patch.organizationName);
  }
  if (patch.specialization !== undefined) {
    columns.push("specialization");
    params.push(patch.specialization);
  }
  if (columns.length === 0) return;

  const valuePlaceholders = columns.map((_, i) => `$${i + 2}`).join(", ");
  const updateClause = columns.map((c, i) => `${c} = $${i + 2}`).join(", ");

  const orgId = actor.memberships[0]?.organizationId;
  await transaction([
    {
      sql: `
        INSERT INTO user_profiles (id, ${columns.join(", ")})
        VALUES ($1, ${valuePlaceholders})
        ON CONFLICT (id) DO UPDATE SET ${updateClause}, updated_at = now()
      `,
      params,
    },
    ...(orgId
      ? [
          auditLogStatement({
            organizationId: orgId,
            actor,
            action: "Profile Updated",
            actionAr: "تحديث الملف الشخصي",
            entityType: "USER",
            entityId: actor.userId,
            permissionSnapshot: "AUTH:EDIT",
          }),
        ]
      : []),
  ]);
}
