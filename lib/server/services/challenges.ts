/**
 * Innovation Challenges — list/create/archive for the Org Admin Challenges
 * page (`app/org/challenges/page.tsx`). Mirrors the shape of
 * lib/server/services/strategic-goals.ts (list + create; the mock page's
 * only mutation is "archive", implemented as a status update — no separate
 * delete). Gated by the existing seeded CHALLENGE:VIEW/CREATE/EDIT
 * permissions (db/migrations/0010_rbac_seed.sql) — "EDIT" is documented
 * there as "تعديل وأرشفة" (edit and archive), so archiving uses EDIT, not a
 * new permission.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requirePermission, requireOrgMembership } from "@/lib/server/auth/guards";
import { NotFoundError, ConflictError } from "@/lib/server/errors";
import { auditLogStatement } from "@/lib/server/audit";
import type { Actor } from "@/lib/server/rbac/permissions";

export interface ChallengeRow {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  status: "DRAFT" | "OPEN" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  strategic_goal_id: string | null;
  priority: number | null;
  linked_ideas_count: number;
  usage_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export async function listChallengesForOrganization(actor: Actor, organizationId: string): Promise<ChallengeRow[]> {
  requirePermission(actor, organizationId, "CHALLENGE", "VIEW");
  return query<ChallengeRow>(
    `SELECT * FROM innovation_challenges WHERE organization_id = $1 ORDER BY priority NULLS LAST, created_at DESC`,
    [organizationId]
  );
}

export interface CreateChallengeInput {
  organizationId: string;
  title: string;
  description: string;
  strategicGoalId?: string;
  priority?: number;
}

export async function createChallenge(actor: Actor, input: CreateChallengeInput): Promise<ChallengeRow> {
  requirePermission(actor, input.organizationId, "CHALLENGE", "CREATE");

  const [rows] = await transaction<[ChallengeRow[], unknown[]]>([
    {
      sql: `
        INSERT INTO innovation_challenges (organization_id, title, description, status, strategic_goal_id, priority, created_by)
        VALUES ($1,$2,$3,'OPEN',$4,$5,$6)
        RETURNING *
      `,
      params: [
        input.organizationId,
        input.title,
        input.description,
        input.strategicGoalId ?? null,
        input.priority ?? null,
        actor.userId,
      ],
    },
    auditLogStatement({
      organizationId: input.organizationId,
      actor,
      action: "Challenge Created",
      actionAr: "إنشاء تحدي ابتكاري",
      entityType: "CHALLENGE",
      entityId: input.title,
      permissionSnapshot: "CHALLENGE:CREATE",
    }),
  ]);

  const challenge = rows[0];
  if (!challenge) throw new ConflictError("Challenge creation did not apply.");
  return challenge;
}

export async function archiveChallenge(actor: Actor, challengeId: string): Promise<ChallengeRow> {
  const existing = await queryOne<ChallengeRow>(`SELECT * FROM innovation_challenges WHERE id = $1`, [challengeId]);
  if (!existing) throw new NotFoundError("Challenge", challengeId);
  requireOrgMembership(actor, existing.organization_id);
  requirePermission(actor, existing.organization_id, "CHALLENGE", "EDIT");

  const [rows] = await transaction<[ChallengeRow[], unknown[]]>([
    {
      sql: `UPDATE innovation_challenges SET status = 'ARCHIVED', updated_at = now() WHERE id = $1 RETURNING *`,
      params: [challengeId],
    },
    auditLogStatement({
      organizationId: existing.organization_id,
      actor,
      action: "Challenge Archived",
      actionAr: "أرشفة تحدي ابتكاري",
      entityType: "CHALLENGE",
      entityId: challengeId,
      permissionSnapshot: "CHALLENGE:EDIT",
    }),
  ]);

  const updated = rows[0];
  if (!updated) throw new ConflictError("Challenge archive did not apply.");
  return updated;
}
