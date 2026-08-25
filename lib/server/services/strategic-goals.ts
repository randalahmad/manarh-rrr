/**
 * Strategic goals domain service.
 * Authorization (approved Phase 5 decision): ORG:MANAGE — the catalog's
 * existing org-level "manage workflow and notifications" permission
 * (p5, "إدارة Workflow والإشعارات") — reused as the closest existing
 * org-wide management permission, since no dedicated STRATEGIC_GOAL area
 * exists and the mock's own "Add Goal" button has no permission check at
 * all (see Phase 5 research notes).
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requirePermission, requireOrgMembership } from "@/lib/server/auth/guards";
import { NotFoundError, ConflictError } from "@/lib/server/errors";
import { auditLogStatement } from "@/lib/server/audit";
import type { Actor } from "@/lib/server/rbac/permissions";

export interface StrategicGoalRow {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "ARCHIVED";
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  measurement_period_start: string | null;
  measurement_period_end: string | null;
  owner_id: string | null;
  progress_percentage: number | null;
  /** Denormalized cache columns (db/migrations/0003) — always 0 for now; no service writes them yet (idea/project ↔ strategic-goal linkage is out of Group F's scope). */
  linked_ideas_count: number;
  linked_projects_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateStrategicGoalInput {
  organizationId: string;
  name: string;
  description: string;
  targetValue?: number;
  unit?: string;
  ownerId?: string;
}

export async function createStrategicGoal(
  actor: Actor,
  input: CreateStrategicGoalInput
): Promise<StrategicGoalRow> {
  requirePermission(actor, input.organizationId, "ORG", "MANAGE");

  const [rows] = await transaction<[StrategicGoalRow[], unknown[]]>([
    {
      sql: `
        INSERT INTO strategic_goals (organization_id, name, description, target_value, unit, owner_id)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
      `,
      params: [input.organizationId, input.name, input.description, input.targetValue ?? null, input.unit ?? null, input.ownerId ?? null],
    },
    auditLogStatement({
      organizationId: input.organizationId,
      actor,
      action: "Strategic Goal Created",
      actionAr: "إضافة هدف استراتيجي",
      entityType: "STRATEGIC_GOAL",
      entityId: input.organizationId,
      permissionSnapshot: "ORG:MANAGE",
    }),
  ]);

  const goal = rows[0];
  if (!goal) throw new ConflictError("Strategic goal creation did not apply.");
  return goal;
}

export interface UpdateStrategicGoalInput {
  name?: string;
  description?: string;
  status?: StrategicGoalRow["status"];
  currentValue?: number;
  progressPercentage?: number;
}

export async function updateStrategicGoal(
  actor: Actor,
  goalId: string,
  patch: UpdateStrategicGoalInput
): Promise<StrategicGoalRow> {
  const goal = await queryOne<StrategicGoalRow>(`SELECT * FROM strategic_goals WHERE id = $1`, [goalId]);
  if (!goal) throw new NotFoundError("Strategic goal", goalId);
  requirePermission(actor, goal.organization_id, "ORG", "MANAGE");

  const sets: string[] = [];
  const params: unknown[] = [];
  const fieldMap: Record<string, unknown> = {
    name: patch.name,
    description: patch.description,
    status: patch.status,
    current_value: patch.currentValue,
    progress_percentage: patch.progressPercentage,
  };
  for (const [column, value] of Object.entries(fieldMap)) {
    if (value === undefined) continue;
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  }
  if (sets.length === 0) return goal;

  params.push(goalId);
  const [rows] = await transaction<[StrategicGoalRow[], unknown[]]>([
    {
      sql: `UPDATE strategic_goals SET ${sets.join(", ")}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
      params,
    },
    auditLogStatement({
      organizationId: goal.organization_id,
      actor,
      action: "Strategic Goal Updated",
      actionAr: "تحديث هدف استراتيجي",
      entityType: "STRATEGIC_GOAL",
      entityId: goalId,
      permissionSnapshot: "ORG:MANAGE",
    }),
  ]);

  const updated = rows[0];
  if (!updated) throw new ConflictError("Strategic goal update did not apply.");
  return updated;
}

export async function listStrategicGoals(actor: Actor, organizationId: string): Promise<StrategicGoalRow[]> {
  requireOrgMembership(actor, organizationId);
  return query<StrategicGoalRow>(
    `SELECT * FROM strategic_goals WHERE organization_id = $1 ORDER BY created_at DESC`,
    [organizationId]
  );
}
