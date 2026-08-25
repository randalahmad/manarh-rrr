/**
 * Evaluator assignment domain service.
 *
 * Business rules ported verbatim from lib/store.tsx's `assignEvaluator`:
 *   - Self-evaluation block, governed by organization_settings.allow_self_evaluation
 *     (the mock's `orgSettings.evaluation.allowSelfEvaluation`, seeded false).
 *   - Assigning an evaluator while the idea is UNDER_REVIEW or
 *     RETURNED_FOR_REVIEW auto-transitions it to UNDER_EVALUATION — a
 *     real side effect in the mock, reproduced here (both are legal edges
 *     in IDEA_TRANSITIONS already, so this doesn't bypass the graph).
 *   - UNIQUE(idea_id, evaluator_id) — one assignment per evaluator per
 *     idea (schema-enforced; surfaced here as a clean ConflictError
 *     instead of a raw constraint-violation error).
 *   - A notification fires to the assigned evaluator (real trigger point
 *     in the mock's `notify()` call list).
 *
 * `minimumEvaluators` (organization_settings) is READ here for future
 * services to consult but is NOT enforced as a hard block anywhere in
 * Phase 5 — the mock defines the setting but never once reads it to gate
 * anything (see Phase 5 research notes, item 3). Enforcing it would be
 * inventing a rule the codebase never actually applied; it's exposed via
 * `getMinimumEvaluators` so a later phase can wire it once that's an
 * explicit decision.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth/guards";
import { NotFoundError, ConflictError } from "@/lib/server/errors";
import { auditLogStatement } from "@/lib/server/audit";
import { createNotificationStatement } from "@/lib/server/services/notifications";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { IdeaRow } from "@/lib/server/services/ideas";

export interface EvaluatorAssignmentRow {
  id: string;
  idea_id: string;
  evaluator_id: string;
  assigned_by: string;
  status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "CANCELLED";
  due_at: string | null;
  assigned_at: string;
  updated_at: string;
}

interface OrgSettingsRow {
  allow_self_evaluation: boolean;
  minimum_evaluators: number | null;
}

export async function getMinimumEvaluators(organizationId: string): Promise<number | null> {
  const row = await queryOne<OrgSettingsRow>(
    `SELECT minimum_evaluators FROM organization_settings WHERE organization_id = $1`,
    [organizationId]
  );
  return row?.minimum_evaluators ?? null;
}

/**
 * Authorization: EVALUATION:ASSIGN in the idea's organization (the
 * catalog grants this to INNOVATION_SPECIALIST and, via the ORG_ADMIN
 * special case, org admins — matching the mock's evaluator-picker being
 * restricted to those roles, see Phase 5 research notes item 3).
 */
export async function assignEvaluator(
  actor: Actor,
  ideaId: string,
  evaluatorUserId: string,
  dueAt?: string
): Promise<EvaluatorAssignmentRow> {
  const idea = await queryOne<IdeaRow>(`SELECT * FROM ideas WHERE id = $1`, [ideaId]);
  if (!idea) throw new NotFoundError("Idea", ideaId);
  requirePermission(actor, idea.organization_id, "EVALUATION", "ASSIGN");

  if (evaluatorUserId === idea.submitter_id) {
    const settings = await queryOne<OrgSettingsRow>(
      `SELECT allow_self_evaluation FROM organization_settings WHERE organization_id = $1`,
      [idea.organization_id]
    );
    if (!settings?.allow_self_evaluation) {
      throw new ConflictError("This idea's submitter cannot be assigned as its own evaluator.");
    }
  }

  const existing = await queryOne(
    `SELECT id FROM idea_evaluator_assignments WHERE idea_id = $1 AND evaluator_id = $2`,
    [ideaId, evaluatorUserId]
  );
  if (existing) {
    throw new ConflictError("This evaluator is already assigned to this idea.");
  }

  const autoTransition = idea.status === "UNDER_REVIEW" || idea.status === "RETURNED_FOR_REVIEW";
  const statements: { sql: string; params?: unknown[] }[] = [
    {
      sql: `
        INSERT INTO idea_evaluator_assignments (idea_id, evaluator_id, assigned_by, due_at)
        VALUES ($1,$2,$3,$4)
        RETURNING *
      `,
      params: [ideaId, evaluatorUserId, actor.userId, dueAt ?? null],
    },
  ];

  if (autoTransition) {
    statements.push({
      sql: `UPDATE ideas SET status = 'UNDER_EVALUATION', updated_at = now() WHERE id = $1`,
      params: [ideaId],
    });
    statements.push({
      sql: `INSERT INTO idea_status_history (idea_id, from_status, to_status, changed_by, note) VALUES ($1,$2,'UNDER_EVALUATION',$3,$4)`,
      params: [ideaId, idea.status, actor.userId, "Auto-transitioned on evaluator assignment"],
    });
  }

  statements.push(
    createNotificationStatement({
      organizationId: idea.organization_id,
      recipientId: evaluatorUserId,
      title: "You have been assigned to evaluate an idea",
      message: `You've been assigned as an evaluator for "${idea.title}".`,
      entityType: "EVALUATION",
      entityId: ideaId,
    })
  );
  statements.push(
    auditLogStatement({
      organizationId: idea.organization_id,
      actor,
      action: "Evaluator Assigned",
      actionAr: "تعيين مقيّم",
      entityType: "IDEA",
      entityId: ideaId,
      newState: evaluatorUserId,
      permissionSnapshot: "EVALUATION:ASSIGN",
    })
  );

  const results = await transaction<[EvaluatorAssignmentRow[], ...unknown[]]>(statements);
  const assignment = results[0][0];
  if (!assignment) throw new ConflictError("Evaluator assignment did not apply.");
  return assignment;
}

export async function listAssignmentsForIdea(actor: Actor, ideaId: string): Promise<EvaluatorAssignmentRow[]> {
  const idea = await queryOne<IdeaRow>(`SELECT organization_id FROM ideas WHERE id = $1`, [ideaId]);
  if (!idea) throw new NotFoundError("Idea", ideaId);
  requirePermission(actor, idea.organization_id, "EVALUATION", "VIEW");
  return query<EvaluatorAssignmentRow>(
    `SELECT * FROM idea_evaluator_assignments WHERE idea_id = $1 ORDER BY assigned_at DESC`,
    [ideaId]
  );
}

export async function listAssignmentsForEvaluator(actor: Actor): Promise<EvaluatorAssignmentRow[]> {
  // Every evaluator can see their own assignment queue — no org-scoped
  // permission check needed beyond "this is your own row" (userId is
  // always the caller's own id here, never client-supplied).
  return query<EvaluatorAssignmentRow>(
    `SELECT * FROM idea_evaluator_assignments WHERE evaluator_id = $1 ORDER BY assigned_at DESC`,
    [actor.userId]
  );
}

/**
 * Phase 6, Group C addition — every assignment across the organization,
 * for the Org Admin evaluations page (app/org/evaluations/page.tsx), which
 * previously read the whole mock `evaluatorAssignments` array. Same
 * EVALUATION:VIEW gate as `listAssignmentsForIdea`, just organization- not
 * idea-scoped.
 */
export async function listAssignmentsForOrganization(
  actor: Actor,
  organizationId: string
): Promise<EvaluatorAssignmentRow[]> {
  requirePermission(actor, organizationId, "EVALUATION", "VIEW");
  return query<EvaluatorAssignmentRow>(
    `
    SELECT a.* FROM idea_evaluator_assignments a
    JOIN ideas i ON i.id = a.idea_id
    WHERE i.organization_id = $1
    ORDER BY a.assigned_at DESC
    `,
    [organizationId]
  );
}

export interface EvaluatorCandidate {
  id: string;
  fullName: string;
}

/**
 * Phase 6, Group C addition — candidate evaluators for the "تعيين مقيم"
 * picker (app/org/evaluations/page.tsx), which previously read the mock
 * `d.users.filter(u => u.role === "EVALUATOR" || u.role === "INNOVATION_SPECIALIST")`.
 * Gated on EVALUATION:ASSIGN — the same permission `assignEvaluator` itself
 * requires — since this is only useful to someone who can actually assign.
 * Not exposed via user-directory.ts (that service is deliberately
 * unauthenticated-beyond-session, whereas "who can be assigned as an
 * evaluator in this org" is a membership/role listing, not just resolving
 * ids you already have).
 */
export async function listEvaluatorCandidates(
  actor: Actor,
  organizationId: string
): Promise<EvaluatorCandidate[]> {
  requirePermission(actor, organizationId, "EVALUATION", "ASSIGN");
  return query<EvaluatorCandidate>(
    `
    SELECT om.user_id AS id, COALESCE(u.name, u.email) AS "fullName"
    FROM organization_memberships om
    JOIN neon_auth.user u ON u.id = om.user_id
    WHERE om.organization_id = $1
      AND om.membership_status = 'ACTIVE'
      AND om.role IN ('EVALUATOR', 'INNOVATION_SPECIALIST')
    ORDER BY "fullName"
    `,
    [organizationId]
  );
}
