/**
 * Teams — read-only listing for the Org Admin Teams page
 * (`app/org/teams/page.tsx`), which only ever displayed teams/members (no
 * create/edit UI existed in the mock version either) — so only VIEW is
 * implemented here, gated by the existing seeded TEAM:VIEW permission
 * (db/migrations/0010_rbac_seed.sql). No new permission invented.
 */
import { query } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth/guards";
import type { Actor } from "@/lib/server/rbac/permissions";

export interface TeamRow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamWithMembers extends TeamRow {
  member_ids: string[];
}

export async function listTeamsForOrganization(actor: Actor, organizationId: string): Promise<TeamWithMembers[]> {
  requirePermission(actor, organizationId, "TEAM", "VIEW");

  const [teams, memberRows] = await Promise.all([
    query<TeamRow>(`SELECT * FROM teams WHERE organization_id = $1 ORDER BY created_at DESC`, [organizationId]),
    query<{ team_id: string; user_id: string }>(
      `SELECT tm.team_id, tm.user_id FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE t.organization_id = $1`,
      [organizationId]
    ),
  ]);

  const membersByTeam = new Map<string, string[]>();
  for (const row of memberRows) {
    membersByTeam.set(row.team_id, [...(membersByTeam.get(row.team_id) ?? []), row.user_id]);
  }

  return teams.map((t) => ({ ...t, member_ids: membersByTeam.get(t.id) ?? [] }));
}
