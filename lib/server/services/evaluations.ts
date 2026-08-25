/**
 * Evaluations domain service.
 *
 * Authorization is deliberately narrower than a plain EVALUATION:EVALUATE
 * permission check: the mock's evaluator picker only ever lists the
 * assigned evaluator against a given idea, and an evaluation is
 * meaningless without an assignment behind it, so this requires an actual
 * `idea_evaluator_assignments` row for (idea, actor) — not just "has the
 * EVALUATE permission somewhere in this org." This is the
 * "evaluation permissions" boundary the Phase 5 test list asks for:
 * having the EVALUATE permission is necessary but not sufficient — you
 * must be the specific person assigned to this specific idea.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth/guards";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/server/errors";
import { auditLogStatement } from "@/lib/server/audit";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { IdeaRow } from "@/lib/server/services/ideas";

export interface EvaluationRow {
  id: string;
  idea_id: string;
  evaluator_id: string;
  strategic_alignment_score: number;
  feasibility_score: number;
  resource_readiness_score: number;
  notes: string;
  submitted_at: string;
}

export interface SubmitEvaluationInput {
  ideaId: string;
  strategicAlignmentScore: number;
  feasibilityScore: number;
  resourceReadinessScore: number;
  notes: string;
}

export async function submitEvaluation(actor: Actor, input: SubmitEvaluationInput): Promise<EvaluationRow> {
  const idea = await queryOne<IdeaRow>(`SELECT * FROM ideas WHERE id = $1`, [input.ideaId]);
  if (!idea) throw new NotFoundError("Idea", input.ideaId);
  requirePermission(actor, idea.organization_id, "EVALUATION", "EVALUATE");

  const assignment = await queryOne<{ id: string; status: string }>(
    `SELECT id, status FROM idea_evaluator_assignments WHERE idea_id = $1 AND evaluator_id = $2`,
    [input.ideaId, actor.userId]
  );
  if (!assignment) {
    throw new ForbiddenError("You are not assigned as an evaluator for this idea.");
  }
  if (assignment.status === "CANCELLED") {
    throw new ForbiddenError("This evaluator assignment has been cancelled.");
  }

  const existing = await queryOne(
    `SELECT id FROM evaluations WHERE idea_id = $1 AND evaluator_id = $2`,
    [input.ideaId, actor.userId]
  );
  if (existing) {
    throw new ConflictError("You have already submitted an evaluation for this idea.");
  }

  const [rows] = await transaction<[EvaluationRow[], unknown[], unknown[]]>([
    {
      sql: `
        INSERT INTO evaluations (
          idea_id, evaluator_id, strategic_alignment_score, feasibility_score,
          resource_readiness_score, notes
        ) VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
      `,
      params: [
        input.ideaId,
        actor.userId,
        input.strategicAlignmentScore,
        input.feasibilityScore,
        input.resourceReadinessScore,
        input.notes,
      ],
    },
    {
      sql: `UPDATE idea_evaluator_assignments SET status = 'COMPLETED', updated_at = now() WHERE id = $1`,
      params: [assignment.id],
    },
    auditLogStatement({
      organizationId: idea.organization_id,
      actor,
      action: "Evaluation Submitted",
      actionAr: "تقديم تقييم",
      entityType: "IDEA",
      entityId: input.ideaId,
      permissionSnapshot: "EVALUATION:EVALUATE",
    }),
  ]);

  const evaluation = rows[0];
  if (!evaluation) throw new ConflictError("Evaluation submission did not apply.");
  return evaluation;
}

export async function listEvaluationsForIdea(actor: Actor, ideaId: string): Promise<EvaluationRow[]> {
  const idea = await queryOne<IdeaRow>(`SELECT organization_id FROM ideas WHERE id = $1`, [ideaId]);
  if (!idea) throw new NotFoundError("Idea", ideaId);
  requirePermission(actor, idea.organization_id, "EVALUATION", "VIEW");
  return query<EvaluationRow>(`SELECT * FROM evaluations WHERE idea_id = $1 ORDER BY submitted_at DESC`, [ideaId]);
}

/**
 * Phase 6, Group C addition — every evaluation across the organization, for
 * the Org Admin evaluations/decisions pages, which previously read the
 * whole mock `evaluations` array. Same EVALUATION:VIEW gate as
 * `listEvaluationsForIdea`, just organization- not idea-scoped.
 */
export async function listEvaluationsForOrganization(
  actor: Actor,
  organizationId: string
): Promise<EvaluationRow[]> {
  requirePermission(actor, organizationId, "EVALUATION", "VIEW");
  return query<EvaluationRow>(
    `
    SELECT e.* FROM evaluations e
    JOIN ideas i ON i.id = e.idea_id
    WHERE i.organization_id = $1
    ORDER BY e.submitted_at DESC
    `,
    [organizationId]
  );
}

export async function countEvaluationsForIdea(ideaId: string): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT count(*)::text AS count FROM evaluations WHERE idea_id = $1`,
    [ideaId]
  );
  return row ? Number(row.count) : 0;
}
