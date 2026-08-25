/**
 * Recommendations and decisions domain service.
 *
 * Authorization notes (both are genuinely under-specified in the mock —
 * see Phase 5 research notes item 4 — so each is grounded in the closest
 * already-approved concept rather than invented from nothing):
 *
 *   - submitRecommendation: the mock has NO permission check on this
 *     action at all (it's not even called from any page). The permission
 *     catalog itself, however, already defines GOVERNANCE:EDIT with the
 *     Arabic note "توثيق التوصية والقرار" — literally "documenting the
 *     recommendation and decision" (lib/mock-data/seed.ts pSeeds p25).
 *     That catalog entry's own stated purpose is this exact action, so
 *     it's used as the gate here rather than leaving the action
 *     unauthenticated-by-omission.
 *   - makeDecision: GOVERNANCE:APPROVE. This IS a real, currently-enforced
 *     check in the mock (the one UI button-visibility check for
 *     decisions — app/org/decisions/[id]/page.tsx) and the permission
 *     catalog's own label is "اتخاذ القرار" ("making the decision").
 *
 * decisionType -> idea status mapping is copied verbatim from
 * lib/store.tsx's `makeDecision` (the DECISION_STATUS_MAP there):
 * APPROVE/CONVERT_TO_PROJECT -> APPROVED (converting to a project is a
 * separate, later action — see projects.ts), CONDITIONALLY_APPROVE ->
 * CONDITIONALLY_APPROVED, DEFER -> DEFERRED, REJECT -> REJECTED,
 * REQUEST_INFORMATION -> NEEDS_INFORMATION.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth/guards";
import { NotFoundError, ValidationError, ConflictError, InvalidTransitionError } from "@/lib/server/errors";
import { canTransitionIdea } from "@/lib/server/workflow/idea-status";
import { auditLogStatement } from "@/lib/server/audit";
import { createNotificationStatement } from "@/lib/server/services/notifications";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { IdeaRow } from "@/lib/server/services/ideas";
import type { RecommendationType } from "@/lib/types";

export interface RecommendationRow {
  id: string;
  idea_id: string;
  evaluation_id: string | null;
  recommendation_type: RecommendationType;
  summary: string;
  submitted_by: string;
  submitted_at: string;
}

export interface DecisionRow {
  id: string;
  idea_id: string | null;
  project_id: string | null;
  recommendation_id: string | null;
  decision_type: RecommendationType;
  reason: string;
  conditions: string | null;
  notes: string | null;
  decided_by: string;
  decided_at: string;
}

export interface SubmitRecommendationInput {
  ideaId: string;
  evaluationId?: string;
  recommendationType: RecommendationType;
  summary: string;
}

export async function submitRecommendation(
  actor: Actor,
  input: SubmitRecommendationInput
): Promise<RecommendationRow> {
  const idea = await queryOne<IdeaRow>(`SELECT * FROM ideas WHERE id = $1`, [input.ideaId]);
  if (!idea) throw new NotFoundError("Idea", input.ideaId);
  requirePermission(actor, idea.organization_id, "GOVERNANCE", "EDIT");

  if (!canTransitionIdea(idea.status, "RECOMMENDATION_SUBMITTED")) {
    throw new InvalidTransitionError(
      `Cannot submit a recommendation while the idea is ${idea.status}.`,
      { from: idea.status }
    );
  }

  const [rows] = await transaction<[RecommendationRow[], unknown[], unknown[]]>([
    {
      sql: `
        INSERT INTO recommendations (idea_id, evaluation_id, recommendation_type, summary, submitted_by)
        VALUES ($1,$2,$3,$4,$5)
        RETURNING *
      `,
      params: [input.ideaId, input.evaluationId ?? null, input.recommendationType, input.summary, actor.userId],
    },
    {
      sql: `UPDATE ideas SET status = 'RECOMMENDATION_SUBMITTED', updated_at = now() WHERE id = $1`,
      params: [input.ideaId],
    },
    auditLogStatement({
      organizationId: idea.organization_id,
      actor,
      action: "Recommendation Submitted",
      actionAr: "تقديم توصية",
      entityType: "IDEA",
      entityId: input.ideaId,
      newState: "RECOMMENDATION_SUBMITTED",
      permissionSnapshot: "GOVERNANCE:EDIT",
    }),
  ]);

  const recommendation = rows[0];
  if (!recommendation) throw new ConflictError("Recommendation submission did not apply.");

  await query(
    `INSERT INTO idea_status_history (idea_id, from_status, to_status, changed_by, note) VALUES ($1,$2,'RECOMMENDATION_SUBMITTED',$3,$4)`,
    [input.ideaId, idea.status, actor.userId, "Recommendation submitted"]
  );

  return recommendation;
}

const DECISION_STATUS_MAP: Record<RecommendationType, IdeaRow["status"]> = {
  APPROVE: "APPROVED",
  CONDITIONALLY_APPROVE: "CONDITIONALLY_APPROVED",
  CONVERT_TO_PROJECT: "APPROVED",
  DEFER: "DEFERRED",
  REJECT: "REJECTED",
  REQUEST_INFORMATION: "NEEDS_INFORMATION",
};

export interface MakeDecisionInput {
  ideaId?: string;
  projectId?: string;
  recommendationId?: string;
  decisionType: RecommendationType;
  reason: string;
  conditions?: string;
  notes?: string;
}

export async function makeDecision(actor: Actor, input: MakeDecisionInput): Promise<DecisionRow> {
  if (!input.ideaId && !input.projectId) {
    throw new ValidationError("A decision must reference an idea or a project.");
  }

  let organizationId: string;
  let idea: IdeaRow | null = null;
  if (input.ideaId) {
    idea = await queryOne<IdeaRow>(`SELECT * FROM ideas WHERE id = $1`, [input.ideaId]);
    if (!idea) throw new NotFoundError("Idea", input.ideaId);
    organizationId = idea.organization_id;
  } else {
    const project = await queryOne<{ organization_id: string }>(
      `SELECT organization_id FROM projects WHERE id = $1`,
      [input.projectId]
    );
    if (!project) throw new NotFoundError("Project", input.projectId);
    organizationId = project.organization_id;
  }

  requirePermission(actor, organizationId, "GOVERNANCE", "APPROVE");

  const statements: { sql: string; params?: unknown[] }[] = [
    {
      sql: `
        INSERT INTO decisions (idea_id, project_id, recommendation_id, decision_type, reason, conditions, notes, decided_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *
      `,
      params: [
        input.ideaId ?? null,
        input.projectId ?? null,
        input.recommendationId ?? null,
        input.decisionType,
        input.reason,
        input.conditions ?? null,
        input.notes ?? null,
        actor.userId,
      ],
    },
  ];

  if (idea) {
    const targetStatus = DECISION_STATUS_MAP[input.decisionType];
    if (!canTransitionIdea(idea.status, targetStatus)) {
      throw new InvalidTransitionError(
        `A ${input.decisionType} decision would move the idea from ${idea.status} to ${targetStatus}, which is not a legal transition.`,
        { from: idea.status, to: targetStatus }
      );
    }
    statements.push({
      sql: `UPDATE ideas SET status = $1, updated_at = now() WHERE id = $2`,
      params: [targetStatus, input.ideaId],
    });
    statements.push({
      sql: `INSERT INTO idea_status_history (idea_id, from_status, to_status, changed_by, note) VALUES ($1,$2,$3,$4,$5)`,
      params: [input.ideaId, idea.status, targetStatus, actor.userId, `Decision: ${input.decisionType}`],
    });
    statements.push(
      createNotificationStatement({
        organizationId,
        recipientId: idea.submitter_id,
        title: "A decision has been made on your idea",
        message: `Your idea "${idea.title}" received a decision: ${input.decisionType}.`,
        entityType: "DECISION",
        entityId: input.ideaId!,
      })
    );
  }

  statements.push(
    auditLogStatement({
      organizationId,
      actor,
      action: "Decision Made",
      actionAr: "اتخاذ قرار",
      entityType: idea ? "IDEA" : "PROJECT",
      entityId: (input.ideaId ?? input.projectId)!,
      newState: input.decisionType,
      decisionDetails: input.reason,
      permissionSnapshot: "GOVERNANCE:APPROVE",
      sensitiveView: true,
    })
  );

  const results = await transaction<[DecisionRow[], ...unknown[]]>(statements);
  const decision = results[0][0];
  if (!decision) throw new ConflictError("Decision did not apply.");
  return decision;
}

export async function listDecisionsForIdea(actor: Actor, ideaId: string): Promise<DecisionRow[]> {
  const idea = await queryOne<IdeaRow>(`SELECT organization_id FROM ideas WHERE id = $1`, [ideaId]);
  if (!idea) throw new NotFoundError("Idea", ideaId);
  requirePermission(actor, idea.organization_id, "GOVERNANCE", "VIEW");
  return query<DecisionRow>(`SELECT * FROM decisions WHERE idea_id = $1 ORDER BY decided_at DESC`, [ideaId]);
}

/**
 * Phase 6, Group C addition — Phase 5 built `submitRecommendation` only;
 * nothing ever read a recommendation back. Same GOVERNANCE:VIEW gate as
 * `listDecisionsForIdea` (the permission catalog's GOVERNANCE:VIEW note,
 * "عرض القرارات", covers this domain's read side generally — recommendations
 * feed directly into decisions and were never given a narrower read gate of
 * their own in the mock or the approved catalog).
 */
export async function listRecommendationsForIdea(actor: Actor, ideaId: string): Promise<RecommendationRow[]> {
  const idea = await queryOne<IdeaRow>(`SELECT organization_id FROM ideas WHERE id = $1`, [ideaId]);
  if (!idea) throw new NotFoundError("Idea", ideaId);
  requirePermission(actor, idea.organization_id, "GOVERNANCE", "VIEW");
  return query<RecommendationRow>(
    `SELECT * FROM recommendations WHERE idea_id = $1 ORDER BY submitted_at DESC`,
    [ideaId]
  );
}

/**
 * Phase 6, Group C addition — every recommendation across the organization,
 * for the Org Admin decisions list page, which previously read the whole
 * mock `recommendations` array.
 */
export async function listRecommendationsForOrganization(
  actor: Actor,
  organizationId: string
): Promise<RecommendationRow[]> {
  requirePermission(actor, organizationId, "GOVERNANCE", "VIEW");
  return query<RecommendationRow>(
    `
    SELECT r.* FROM recommendations r
    JOIN ideas i ON i.id = r.idea_id
    WHERE i.organization_id = $1
    ORDER BY r.submitted_at DESC
    `,
    [organizationId]
  );
}

/**
 * Phase 6, Group C addition — every idea-linked decision across the
 * organization, for the Org Admin decisions list page. Deliberately joins
 * through `ideas` only (not `projects`) — a decision can also reference a
 * project directly, but project-linked decisions are Group D (project
 * conversion) scope, still mocked, and out of this list's purpose.
 */
export async function listDecisionsForOrganization(
  actor: Actor,
  organizationId: string
): Promise<DecisionRow[]> {
  requirePermission(actor, organizationId, "GOVERNANCE", "VIEW");
  return query<DecisionRow>(
    `
    SELECT d.* FROM decisions d
    JOIN ideas i ON i.id = d.idea_id
    WHERE i.organization_id = $1
    ORDER BY d.decided_at DESC
    `,
    [organizationId]
  );
}
