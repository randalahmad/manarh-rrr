/**
 * Organization Settings — the Org Admin Settings page
 * (`app/org/settings/page.tsx`) edits six things behind one "Save" button:
 * the org profile (`organizations`), `organization_settings`,
 * `workflow_stage_configs`, `evaluation_criteria`, `notification_templates`,
 * and `escalation_rules`. The mock version always replaced the whole bundle
 * on save (one `updateOrgSettings(nextSettings)` call, no per-row API) — so
 * this mirrors that exact shape: one read (`getOrganizationSettingsBundle`)
 * and one atomic replace-everything write (`saveOrganizationSettingsBundle`),
 * rather than inventing six separate CRUD surfaces the UI never had.
 *
 * `transaction()` (lib/server/db.ts) runs a batch of independent statements
 * — a later statement can't branch on an earlier one's result — so row ids
 * for the delete-then-reinsert of workflow_stage_configs (which
 * escalation_rules.stage_id references) are generated here in application
 * code before building the statement list, not read back mid-transaction.
 * Deleting the old stage rows cascades to delete their old escalation_rules
 * (ON DELETE CASCADE, db/migrations/0007), so no separate escalation_rules
 * delete is needed.
 *
 * Gated by the existing seeded ORG:VIEW/EDIT permissions
 * (db/migrations/0010_rbac_seed.sql) — no new permission invented.
 */
import { randomUUID } from "crypto";
import { query, queryOne, transaction } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth/guards";
import { auditLogStatement } from "@/lib/server/audit";
import { ConflictError } from "@/lib/server/errors";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { UserRole } from "@/lib/types";

export interface OrganizationProfileRow {
  id: string;
  name: string;
  description: string;
  sector: string;
  contact_email: string;
  contact_phone: string;
  status: "ACTIVE" | "SUSPENDED";
}

export interface OrganizationSettingsRow {
  organization_id: string;
  require_evaluation_before_decision: boolean;
  allow_idea_withdrawal_after_approval: boolean;
  auto_notify_stakeholders_on_decision: boolean;
  default_decision_sla_days: number;
  minimum_evaluators: number | null;
  allow_self_evaluation: boolean;
  notify_on_new_idea: boolean;
  notify_on_decision: boolean;
  notify_on_project_update: boolean;
  daily_digest: boolean;
  escalation_enabled: boolean;
}

export interface WorkflowStageConfigRow {
  id: string;
  organization_id: string;
  name: string;
  name_ar: string;
  stage_order: number;
  enabled: boolean;
  duration_days: number;
  is_system_stage: boolean;
  protected: boolean;
}

export interface EvaluationCriterionRow {
  id: string;
  organization_id: string;
  name: string;
  name_ar: string;
  description: string | null;
  max_score: number;
  weight: number | null;
  is_active: boolean;
}

export interface NotificationTemplateRow {
  id: string;
  organization_id: string;
  event: string;
  event_ar: string;
  channel: "IN_APP" | "EMAIL";
  subject: string;
  body: string;
  is_active: boolean;
}

export interface EscalationRuleRow {
  id: string;
  stage_id: string;
  after_days: number;
  notify_role: UserRole;
  is_active: boolean;
}

export interface OrganizationSettingsBundle {
  organization: OrganizationProfileRow;
  settings: OrganizationSettingsRow | null;
  workflowStages: WorkflowStageConfigRow[];
  evaluationCriteria: EvaluationCriterionRow[];
  notificationTemplates: NotificationTemplateRow[];
  escalationRules: EscalationRuleRow[];
}

export async function getOrganizationSettingsBundle(
  actor: Actor,
  organizationId: string
): Promise<OrganizationSettingsBundle> {
  requirePermission(actor, organizationId, "ORG", "VIEW");

  const [organization, settings, workflowStages, evaluationCriteria, notificationTemplates] = await Promise.all([
    queryOne<OrganizationProfileRow>(
      `SELECT id, name, description, sector, contact_email, contact_phone, status FROM organizations WHERE id = $1`,
      [organizationId]
    ),
    queryOne<OrganizationSettingsRow>(`SELECT * FROM organization_settings WHERE organization_id = $1`, [organizationId]),
    query<WorkflowStageConfigRow>(
      `SELECT * FROM workflow_stage_configs WHERE organization_id = $1 ORDER BY stage_order ASC`,
      [organizationId]
    ),
    query<EvaluationCriterionRow>(`SELECT * FROM evaluation_criteria WHERE organization_id = $1`, [organizationId]),
    query<NotificationTemplateRow>(`SELECT * FROM notification_templates WHERE organization_id = $1`, [organizationId]),
  ]);

  if (!organization) throw new ConflictError("Organization not found.");

  const escalationRules = workflowStages.length
    ? await query<EscalationRuleRow>(
        `SELECT * FROM escalation_rules WHERE stage_id = ANY($1::uuid[])`,
        [workflowStages.map((s) => s.id)]
      )
    : [];

  return { organization, settings, workflowStages, evaluationCriteria, notificationTemplates, escalationRules };
}

export interface SaveOrganizationSettingsInput {
  organization: { name: string; description: string; sector: string; contactEmail: string; contactPhone: string; status: "ACTIVE" | "SUSPENDED" };
  settings: Omit<OrganizationSettingsRow, "organization_id">;
  workflowStages: Omit<WorkflowStageConfigRow, "id" | "organization_id">[];
  evaluationCriteria: Omit<EvaluationCriterionRow, "id" | "organization_id">[];
  notificationTemplates: Omit<NotificationTemplateRow, "id" | "organization_id">[];
  /** References a stage by its POSITION in `workflowStages` (not an id — the real ids are generated during save). */
  escalationRules: { stageIndex: number; afterDays: number; notifyRole: UserRole; isActive: boolean }[];
}

/** Builds a `($1,$2,...),($n+1,...)` multi-row VALUES clause and its flat params array. */
function buildValuesClause(rows: unknown[][], startIndex = 1): { clause: string; params: unknown[] } {
  const params: unknown[] = [];
  let cursor = startIndex;
  const groups = rows.map((row) => {
    const placeholders = row.map(() => `$${cursor++}`);
    params.push(...row);
    return `(${placeholders.join(",")})`;
  });
  return { clause: groups.join(","), params };
}

export async function saveOrganizationSettingsBundle(
  actor: Actor,
  organizationId: string,
  input: SaveOrganizationSettingsInput
): Promise<OrganizationSettingsBundle> {
  requirePermission(actor, organizationId, "ORG", "EDIT");

  const stageIds = input.workflowStages.map(() => randomUUID());

  const statements: { sql: string; params?: unknown[] }[] = [
    {
      sql: `UPDATE organizations SET name=$1, description=$2, sector=$3, contact_email=$4, contact_phone=$5, status=$6, updated_by=$7, updated_at=now() WHERE id=$8`,
      params: [
        input.organization.name,
        input.organization.description,
        input.organization.sector,
        input.organization.contactEmail,
        input.organization.contactPhone,
        input.organization.status,
        actor.userId,
        organizationId,
      ],
    },
    {
      sql: `
        INSERT INTO organization_settings (
          organization_id, require_evaluation_before_decision, allow_idea_withdrawal_after_approval,
          auto_notify_stakeholders_on_decision, default_decision_sla_days, minimum_evaluators, allow_self_evaluation,
          notify_on_new_idea, notify_on_decision, notify_on_project_update, daily_digest, escalation_enabled, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
        ON CONFLICT (organization_id) DO UPDATE SET
          require_evaluation_before_decision = EXCLUDED.require_evaluation_before_decision,
          allow_idea_withdrawal_after_approval = EXCLUDED.allow_idea_withdrawal_after_approval,
          auto_notify_stakeholders_on_decision = EXCLUDED.auto_notify_stakeholders_on_decision,
          default_decision_sla_days = EXCLUDED.default_decision_sla_days,
          minimum_evaluators = EXCLUDED.minimum_evaluators,
          allow_self_evaluation = EXCLUDED.allow_self_evaluation,
          notify_on_new_idea = EXCLUDED.notify_on_new_idea,
          notify_on_decision = EXCLUDED.notify_on_decision,
          notify_on_project_update = EXCLUDED.notify_on_project_update,
          daily_digest = EXCLUDED.daily_digest,
          escalation_enabled = EXCLUDED.escalation_enabled,
          updated_at = now()
      `,
      params: [
        organizationId,
        input.settings.require_evaluation_before_decision,
        input.settings.allow_idea_withdrawal_after_approval,
        input.settings.auto_notify_stakeholders_on_decision,
        input.settings.default_decision_sla_days,
        input.settings.minimum_evaluators,
        input.settings.allow_self_evaluation,
        input.settings.notify_on_new_idea,
        input.settings.notify_on_decision,
        input.settings.notify_on_project_update,
        input.settings.daily_digest,
        input.settings.escalation_enabled,
      ],
    },
    // Deleting old stages cascades to delete their old escalation_rules.
    { sql: `DELETE FROM workflow_stage_configs WHERE organization_id = $1`, params: [organizationId] },
    { sql: `DELETE FROM evaluation_criteria WHERE organization_id = $1`, params: [organizationId] },
    { sql: `DELETE FROM notification_templates WHERE organization_id = $1`, params: [organizationId] },
  ];

  if (input.workflowStages.length > 0) {
    const rows = input.workflowStages.map((s, i) => [
      stageIds[i],
      organizationId,
      s.name,
      s.name_ar,
      s.stage_order,
      s.enabled,
      s.duration_days,
      s.is_system_stage,
      s.protected,
    ]);
    const { clause, params } = buildValuesClause(rows);
    statements.push({
      sql: `INSERT INTO workflow_stage_configs (id, organization_id, name, name_ar, stage_order, enabled, duration_days, is_system_stage, protected) VALUES ${clause}`,
      params,
    });
  }

  if (input.evaluationCriteria.length > 0) {
    const rows = input.evaluationCriteria.map((c) => [
      organizationId,
      c.name,
      c.name_ar,
      c.description,
      c.max_score,
      c.weight,
      c.is_active,
    ]);
    const { clause, params } = buildValuesClause(rows);
    statements.push({
      sql: `INSERT INTO evaluation_criteria (organization_id, name, name_ar, description, max_score, weight, is_active) VALUES ${clause}`,
      params,
    });
  }

  if (input.notificationTemplates.length > 0) {
    const rows = input.notificationTemplates.map((t) => [
      organizationId,
      t.event,
      t.event_ar,
      t.channel,
      t.subject,
      t.body,
      t.is_active,
    ]);
    const { clause, params } = buildValuesClause(rows);
    statements.push({
      sql: `INSERT INTO notification_templates (organization_id, event, event_ar, channel, subject, body, is_active) VALUES ${clause}`,
      params,
    });
  }

  if (input.escalationRules.length > 0) {
    const rows = input.escalationRules
      .filter((r) => stageIds[r.stageIndex])
      .map((r) => [stageIds[r.stageIndex], r.afterDays, r.notifyRole, r.isActive]);
    if (rows.length > 0) {
      const { clause, params } = buildValuesClause(rows);
      statements.push({
        sql: `INSERT INTO escalation_rules (stage_id, after_days, notify_role, is_active) VALUES ${clause}`,
        params,
      });
    }
  }

  statements.push(
    auditLogStatement({
      organizationId,
      actor,
      action: "Organization Settings Updated",
      actionAr: "تحديث إعدادات الجهة",
      entityType: "ORG",
      entityId: organizationId,
      permissionSnapshot: "ORG:EDIT",
    })
  );

  await transaction(statements);

  return getOrganizationSettingsBundle(actor, organizationId);
}
