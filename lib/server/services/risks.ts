/**
 * Project risks domain service. Authorization: RISK:CREATE / RISK:EDIT —
 * dedicated catalog areas (p36-p38), same posture as tasks.ts.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requirePermission, requireOrgMembership } from "@/lib/server/auth/guards";
import { NotFoundError, ConflictError } from "@/lib/server/errors";
import { auditLogStatement } from "@/lib/server/audit";
import { createNotificationStatement } from "@/lib/server/services/notifications";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { ProjectRow } from "@/lib/server/services/projects";

export interface ProjectRiskRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "MITIGATED" | "CLOSED";
  owner_id: string | null;
  mitigation_plan: string | null;
  blocker: boolean;
  created_at: string;
  updated_at: string;
}

async function loadProjectOrThrow(projectId: string): Promise<ProjectRow> {
  const project = await queryOne<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [projectId]);
  if (!project) throw new NotFoundError("Project", projectId);
  return project;
}

export interface CreateRiskInput {
  projectId: string;
  title: string;
  description: string;
  level: ProjectRiskRow["level"];
  ownerId?: string;
  mitigationPlan?: string;
  blocker?: boolean;
}

export async function createRisk(actor: Actor, input: CreateRiskInput): Promise<ProjectRiskRow> {
  const project = await loadProjectOrThrow(input.projectId);
  requirePermission(actor, project.organization_id, "RISK", "CREATE");

  const statements: { sql: string; params?: unknown[] }[] = [
    {
      sql: `
        INSERT INTO project_risks (project_id, title, description, level, owner_id, mitigation_plan, blocker)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
      `,
      params: [
        input.projectId,
        input.title,
        input.description,
        input.level,
        input.ownerId ?? null,
        input.mitigationPlan ?? null,
        input.blocker ?? false,
      ],
    },
    createNotificationStatement({
      organizationId: project.organization_id,
      recipientId: project.owner_id,
      title: "A new risk/blocker was reported",
      message: `"${input.title}" was reported on "${project.name}".`,
      entityType: "PROJECT",
      entityId: input.projectId,
    }),
    auditLogStatement({
      organizationId: project.organization_id,
      actor,
      action: "Risk Created",
      actionAr: "إضافة خطر أو معوق",
      entityType: "PROJECT",
      entityId: input.projectId,
      permissionSnapshot: "RISK:CREATE",
    }),
  ];

  const results = await transaction<[ProjectRiskRow[], ...unknown[]]>(statements);
  const risk = results[0][0];
  if (!risk) throw new ConflictError("Risk creation did not apply.");
  return risk;
}

export interface UpdateRiskInput {
  status?: ProjectRiskRow["status"];
  level?: ProjectRiskRow["level"];
  mitigationPlan?: string;
  blocker?: boolean;
}

export async function updateRisk(actor: Actor, riskId: string, patch: UpdateRiskInput): Promise<ProjectRiskRow> {
  const risk = await queryOne<ProjectRiskRow>(`SELECT * FROM project_risks WHERE id = $1`, [riskId]);
  if (!risk) throw new NotFoundError("Risk", riskId);
  const project = await loadProjectOrThrow(risk.project_id);
  requirePermission(actor, project.organization_id, "RISK", "EDIT");

  const sets: string[] = [];
  const params: unknown[] = [];
  const fieldMap: Record<string, unknown> = {
    status: patch.status,
    level: patch.level,
    mitigation_plan: patch.mitigationPlan,
    blocker: patch.blocker,
  };
  for (const [column, value] of Object.entries(fieldMap)) {
    if (value === undefined) continue;
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  }
  if (sets.length === 0) return risk;

  params.push(riskId);
  const [rows] = await transaction<[ProjectRiskRow[], unknown[]]>([
    {
      sql: `UPDATE project_risks SET ${sets.join(", ")}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
      params,
    },
    auditLogStatement({
      organizationId: project.organization_id,
      actor,
      action: "Risk Updated",
      actionAr: "تحديث خطر أو معوق",
      entityType: "PROJECT",
      entityId: risk.project_id,
      permissionSnapshot: "RISK:EDIT",
    }),
  ]);

  const updated = rows[0];
  if (!updated) throw new ConflictError("Risk update did not apply.");
  return updated;
}

export async function listRisksForProject(actor: Actor, projectId: string): Promise<ProjectRiskRow[]> {
  const project = await loadProjectOrThrow(projectId);
  requireOrgMembership(actor, project.organization_id);
  return query<ProjectRiskRow>(`SELECT * FROM project_risks WHERE project_id = $1 ORDER BY created_at DESC`, [
    projectId,
  ]);
}
