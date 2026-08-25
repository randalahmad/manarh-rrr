/**
 * KPI and impact-measurement domain service.
 *
 * Both tables allow their subject to be a project, an idea, or (KPIs only)
 * a strategic goal, with a CHECK constraint requiring at least one
 * (db/migrations/0006_measurement.sql). Organization scope is resolved
 * from whichever subject is set, exactly as the schema's own CHECK
 * constraint defines "must reference something."
 *
 * Authorization: KPI has only VIEW/EDIT in the approved catalog (p39-p40 —
 * no dedicated CREATE action exists for KPIs), so creating a KPI is gated
 * on KPI:EDIT — not an invented CREATE permission. IMPACT has a real
 * VIEW/CREATE/EDIT set (p41-p43), used directly.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth/guards";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/server/errors";
import { auditLogStatement } from "@/lib/server/audit";
import type { Actor } from "@/lib/server/rbac/permissions";

async function resolveSubjectOrg(subject: {
  projectId?: string;
  ideaId?: string;
  strategicGoalId?: string;
}): Promise<string> {
  if (subject.projectId) {
    const row = await queryOne<{ organization_id: string }>(
      `SELECT organization_id FROM projects WHERE id = $1`,
      [subject.projectId]
    );
    if (!row) throw new NotFoundError("Project", subject.projectId);
    return row.organization_id;
  }
  if (subject.ideaId) {
    const row = await queryOne<{ organization_id: string }>(`SELECT organization_id FROM ideas WHERE id = $1`, [
      subject.ideaId,
    ]);
    if (!row) throw new NotFoundError("Idea", subject.ideaId);
    return row.organization_id;
  }
  if (subject.strategicGoalId) {
    const row = await queryOne<{ organization_id: string }>(
      `SELECT organization_id FROM strategic_goals WHERE id = $1`,
      [subject.strategicGoalId]
    );
    if (!row) throw new NotFoundError("Strategic goal", subject.strategicGoalId);
    return row.organization_id;
  }
  throw new ValidationError("Must reference a project, idea, or strategic goal.");
}

export interface KpiRow {
  id: string;
  project_id: string | null;
  idea_id: string | null;
  strategic_goal_id: string | null;
  name: string;
  unit: string;
  target_value: number;
  current_value: number;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateKpiInput {
  projectId?: string;
  ideaId?: string;
  strategicGoalId?: string;
  name: string;
  unit: string;
  targetValue: number;
  currentValue?: number;
  ownerId?: string;
}

export async function createKpi(actor: Actor, input: CreateKpiInput): Promise<KpiRow> {
  const organizationId = await resolveSubjectOrg(input);
  requirePermission(actor, organizationId, "KPI", "EDIT");

  const [rows] = await transaction<[KpiRow[], unknown[]]>([
    {
      sql: `
        INSERT INTO kpis (project_id, idea_id, strategic_goal_id, name, unit, target_value, current_value, owner_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *
      `,
      params: [
        input.projectId ?? null,
        input.ideaId ?? null,
        input.strategicGoalId ?? null,
        input.name,
        input.unit,
        input.targetValue,
        input.currentValue ?? 0,
        input.ownerId ?? null,
      ],
    },
    auditLogStatement({
      organizationId,
      actor,
      action: "KPI Created",
      actionAr: "إضافة مؤشر أداء",
      entityType: "KPI",
      entityId: input.projectId ?? input.ideaId ?? input.strategicGoalId ?? "unknown",
      permissionSnapshot: "KPI:EDIT",
    }),
  ]);

  const kpi = rows[0];
  if (!kpi) throw new ConflictError("KPI creation did not apply.");
  return kpi;
}

export async function updateKpiValue(actor: Actor, kpiId: string, currentValue: number): Promise<KpiRow> {
  const kpi = await queryOne<KpiRow>(`SELECT * FROM kpis WHERE id = $1`, [kpiId]);
  if (!kpi) throw new NotFoundError("KPI", kpiId);
  const organizationId = await resolveSubjectOrg({
    projectId: kpi.project_id ?? undefined,
    ideaId: kpi.idea_id ?? undefined,
    strategicGoalId: kpi.strategic_goal_id ?? undefined,
  });
  requirePermission(actor, organizationId, "KPI", "EDIT");

  const [rows] = await transaction<[KpiRow[], unknown[]]>([
    {
      sql: `UPDATE kpis SET current_value = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      params: [currentValue, kpiId],
    },
    auditLogStatement({
      organizationId,
      actor,
      action: "KPI Updated",
      actionAr: "تحديث مؤشر أداء",
      entityType: "KPI",
      entityId: kpiId,
      permissionSnapshot: "KPI:EDIT",
    }),
  ]);

  const updated = rows[0];
  if (!updated) throw new ConflictError("KPI update did not apply.");
  return updated;
}

export interface ImpactMeasurementRow {
  id: string;
  project_id: string | null;
  idea_id: string | null;
  type: "FINANCIAL" | "OPERATIONAL" | "CUSTOMER" | "STRATEGIC" | "OTHER";
  description: string;
  baseline_value: number | null;
  target_value: number | null;
  actual_value: number | null;
  unit: string | null;
  measured_by: string;
  measured_at: string;
}

export interface CreateImpactMeasurementInput {
  projectId?: string;
  ideaId?: string;
  type: ImpactMeasurementRow["type"];
  description: string;
  baselineValue?: number;
  targetValue?: number;
  actualValue?: number;
  unit?: string;
}

export async function createImpactMeasurement(
  actor: Actor,
  input: CreateImpactMeasurementInput
): Promise<ImpactMeasurementRow> {
  const organizationId = await resolveSubjectOrg(input);
  requirePermission(actor, organizationId, "IMPACT", "CREATE");

  const [rows] = await transaction<[ImpactMeasurementRow[], unknown[]]>([
    {
      sql: `
        INSERT INTO impact_measurements (
          project_id, idea_id, type, description, baseline_value, target_value, actual_value, unit, measured_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *
      `,
      params: [
        input.projectId ?? null,
        input.ideaId ?? null,
        input.type,
        input.description,
        input.baselineValue ?? null,
        input.targetValue ?? null,
        input.actualValue ?? null,
        input.unit ?? null,
        actor.userId,
      ],
    },
    auditLogStatement({
      organizationId,
      actor,
      action: "Impact Measurement Created",
      actionAr: "إضافة قياس أثر",
      entityType: "IMPACT",
      entityId: input.projectId ?? input.ideaId ?? "unknown",
      permissionSnapshot: "IMPACT:CREATE",
    }),
  ]);

  const measurement = rows[0];
  if (!measurement) throw new ConflictError("Impact measurement creation did not apply.");
  return measurement;
}

export async function listKpisForSubject(
  actor: Actor,
  subject: { projectId?: string; ideaId?: string; strategicGoalId?: string }
): Promise<KpiRow[]> {
  const organizationId = await resolveSubjectOrg(subject);
  requirePermission(actor, organizationId, "KPI", "VIEW");
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (subject.projectId) {
    params.push(subject.projectId);
    conditions.push(`project_id = $${params.length}`);
  }
  if (subject.ideaId) {
    params.push(subject.ideaId);
    conditions.push(`idea_id = $${params.length}`);
  }
  if (subject.strategicGoalId) {
    params.push(subject.strategicGoalId);
    conditions.push(`strategic_goal_id = $${params.length}`);
  }
  return query<KpiRow>(`SELECT * FROM kpis WHERE ${conditions.join(" OR ")} ORDER BY created_at DESC`, params);
}

export async function listImpactMeasurementsForSubject(
  actor: Actor,
  subject: { projectId?: string; ideaId?: string }
): Promise<ImpactMeasurementRow[]> {
  const organizationId = await resolveSubjectOrg(subject);
  requirePermission(actor, organizationId, "IMPACT", "VIEW");
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (subject.projectId) {
    params.push(subject.projectId);
    conditions.push(`project_id = $${params.length}`);
  }
  if (subject.ideaId) {
    params.push(subject.ideaId);
    conditions.push(`idea_id = $${params.length}`);
  }
  return query<ImpactMeasurementRow>(
    `SELECT * FROM impact_measurements WHERE ${conditions.join(" OR ")} ORDER BY measured_at DESC`,
    params
  );
}
