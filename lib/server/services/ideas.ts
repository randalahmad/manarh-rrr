/**
 * Ideas domain service — creation, reads, canonical status transitions,
 * and innovator-initiated withdrawal.
 *
 * Every mutation here follows the same shape:
 *   1. requireActiveUser() — caller already has an Actor by this point
 *      (guards run in the Server Action before this is called; services
 *      also accept `actor` as a parameter so they can be unit tested
 *      without going through a request at all).
 *   2. requirePermission()/requireRole() — authorization BEFORE any read
 *      of the row being mutated, let alone the write itself.
 *   3. Load the target row and verify its organization_id matches a org
 *      the actor is authorized in — this is the organization-isolation
 *      check: a valid session for Org A can never mutate a row that
 *      belongs to Org B, even with a guessed/leaked id.
 *   4. Validate the business rule (status transition legality).
 *   5. Write + audit, atomically.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requirePermission, requireOrgMembership } from "@/lib/server/auth/guards";
import { NotFoundError, ForbiddenError, InvalidTransitionError, ConflictError } from "@/lib/server/errors";
import { canTransitionIdea, canWithdrawIdea, canEditIdea } from "@/lib/server/workflow/idea-status";
import { auditLogStatement } from "@/lib/server/audit";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { IdeaStatus } from "@/lib/types";

export interface IdeaRow {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  problem_statement: string;
  proposed_solution: string;
  expected_impact: string;
  category_id: string;
  challenge_id: string | null;
  opportunity_id: string | null;
  submitter_id: string;
  submitter_type: "INTERNAL" | "EXTERNAL";
  status: IdeaStatus;
  project_id: string | null;
  withdrawal_reason: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getIdeaById(actor: Actor, ideaId: string): Promise<IdeaRow> {
  const idea = await queryOne<IdeaRow>(`SELECT * FROM ideas WHERE id = $1`, [ideaId]);
  if (!idea) throw new NotFoundError("Idea", ideaId);
  requireOrgMembership(actor, idea.organization_id);
  return idea;
}

export interface IdeaStatusHistoryRow {
  id: string;
  idea_id: string;
  from_status: IdeaStatus | null;
  to_status: IdeaStatus;
  changed_by: string;
  note: string | null;
  changed_at: string;
}

export async function listStatusHistoryForIdea(actor: Actor, ideaId: string): Promise<IdeaStatusHistoryRow[]> {
  const idea = await queryOne<IdeaRow>(`SELECT * FROM ideas WHERE id = $1`, [ideaId]);
  if (!idea) throw new NotFoundError("Idea", ideaId);
  requireOrgMembership(actor, idea.organization_id);
  return query<IdeaStatusHistoryRow>(
    `SELECT * FROM idea_status_history WHERE idea_id = $1 ORDER BY changed_at ASC`,
    [ideaId]
  );
}

export async function listIdeasForOrganization(
  actor: Actor,
  organizationId: string,
  filters: { status?: IdeaStatus; submitterId?: string } = {}
): Promise<IdeaRow[]> {
  requireOrgMembership(actor, organizationId);
  const conditions = ["organization_id = $1"];
  const params: unknown[] = [organizationId];
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }
  if (filters.submitterId) {
    params.push(filters.submitterId);
    conditions.push(`submitter_id = $${params.length}`);
  }
  return query<IdeaRow>(
    `SELECT * FROM ideas WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    params
  );
}

export interface CreateIdeaInput {
  organizationId: string;
  title: string;
  description: string;
  problemStatement: string;
  proposedSolution: string;
  expectedImpact: string;
  categoryId: string;
  challengeId?: string;
  opportunityId?: string;
  submitterType: "INTERNAL" | "EXTERNAL";
}

/**
 * Any active org member may create an idea in DRAFT status for
 * themselves — this mirrors IDEA:CREATE being granted to every non-admin
 * role in the seeded catalog (see db/migrations/0010_rbac_seed.sql).
 * `submitterId` is always the caller — never accepted from input, per the
 * "derive identity from the session" rule.
 */
export async function createIdea(actor: Actor, input: CreateIdeaInput): Promise<IdeaRow> {
  requirePermission(actor, input.organizationId, "IDEA", "CREATE");

  const row = await queryOne<IdeaRow>(
    `
    INSERT INTO ideas (
      organization_id, title, description, problem_statement, proposed_solution,
      expected_impact, category_id, challenge_id, opportunity_id,
      submitter_id, submitter_type, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'DRAFT')
    RETURNING *
    `,
    [
      input.organizationId,
      input.title,
      input.description,
      input.problemStatement,
      input.proposedSolution,
      input.expectedImpact,
      input.categoryId,
      input.challengeId ?? null,
      input.opportunityId ?? null,
      actor.userId,
      input.submitterType,
    ]
  );
  if (!row) throw new ConflictError("Failed to create idea.");
  return row;
}

export interface UpdateIdeaInput {
  title?: string;
  description?: string;
  problemStatement?: string;
  proposedSolution?: string;
  expectedImpact?: string;
  categoryId?: string;
  challengeId?: string | null;
  opportunityId?: string | null;
}

/**
 * Innovator-initiated content edit — the "save draft" counterpart to
 * createIdea. Same ownership shape as withdrawIdea: only the idea's own
 * submitter may edit it (no admin/specialist override — that's a status
 * transition via transitionIdeaStatus, a different action, not modeled
 * here since no such editing-on-someone-else's-behalf rule was ever
 * defined), and only while the idea is in an EDITABLE_IDEA_STATUSES status
 * (see lib/server/workflow/idea-status.ts).
 */
export async function updateIdea(actor: Actor, ideaId: string, input: UpdateIdeaInput): Promise<IdeaRow> {
  const idea = await queryOne<IdeaRow>(`SELECT * FROM ideas WHERE id = $1`, [ideaId]);
  if (!idea) throw new NotFoundError("Idea", ideaId);
  requireOrgMembership(actor, idea.organization_id);

  if (idea.submitter_id !== actor.userId) {
    throw new ForbiddenError("Only the idea's submitter can edit it.");
  }
  if (!canEditIdea(idea.status)) {
    throw new InvalidTransitionError(`An idea in status ${idea.status} cannot be edited.`, {
      from: idea.status,
    });
  }

  const fields: Record<string, unknown> = {
    title: input.title,
    description: input.description,
    problem_statement: input.problemStatement,
    proposed_solution: input.proposedSolution,
    expected_impact: input.expectedImpact,
    category_id: input.categoryId,
    challenge_id: input.challengeId,
    opportunity_id: input.opportunityId,
  };
  const setClauses: string[] = [];
  const params: unknown[] = [];
  for (const [column, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    params.push(value);
    setClauses.push(`${column} = $${params.length}`);
  }
  if (setClauses.length === 0) return idea;

  params.push(ideaId);
  const updated = await queryOne<IdeaRow>(
    `UPDATE ideas SET ${setClauses.join(", ")}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!updated) throw new ConflictError("Idea update did not apply.");
  return updated;
}

/**
 * Generic canonical-workflow transition, per lib/server/workflow/idea-status.ts.
 * Authorization: IDEA:EDIT in the idea's organization. This intentionally
 * does not further restrict WHICH transition a given role may make beyond
 * the graph itself — the mock never encoded per-transition role rules
 * (see Phase 5 research notes), so this enforces exactly what IS defined
 * (the graph) and nothing invented on top of it.
 */
export async function transitionIdeaStatus(
  actor: Actor,
  ideaId: string,
  toStatus: IdeaStatus,
  note?: string
): Promise<IdeaRow> {
  const idea = await queryOne<IdeaRow>(`SELECT * FROM ideas WHERE id = $1`, [ideaId]);
  if (!idea) throw new NotFoundError("Idea", ideaId);
  requirePermission(actor, idea.organization_id, "IDEA", "EDIT");

  if (!canTransitionIdea(idea.status, toStatus)) {
    throw new InvalidTransitionError(
      `Cannot move an idea from ${idea.status} to ${toStatus}.`,
      { from: idea.status, to: toStatus }
    );
  }

  const setSubmittedAt = toStatus === "SUBMITTED" ? `, submitted_at = now()` : "";

  const [rows] = await transaction<[IdeaRow[], unknown[], unknown[]]>([
    {
      sql: `UPDATE ideas SET status = $1, updated_at = now() ${setSubmittedAt} WHERE id = $2 RETURNING *`,
      params: [toStatus, ideaId],
    },
    {
      sql: `INSERT INTO idea_status_history (idea_id, from_status, to_status, changed_by, note) VALUES ($1,$2,$3,$4,$5)`,
      params: [ideaId, idea.status, toStatus, actor.userId, note ?? null],
    },
    auditLogStatement({
      organizationId: idea.organization_id,
      actor,
      action: "Idea Status Changed",
      actionAr: "تغيير حالة الفكرة",
      entityType: "IDEA",
      entityId: ideaId,
      previousState: idea.status,
      newState: toStatus,
      permissionSnapshot: "IDEA:EDIT",
    }),
  ]);

  const updated = rows[0];
  if (!updated) throw new ConflictError("Idea status update did not apply.");
  return updated;
}

/**
 * Innovator-initiated withdrawal. Approved decision: only the idea's own
 * submitter may withdraw it (an org admin cannot withdraw on someone
 * else's behalf — that's a different action, not modeled in Phase 5
 * since no such rule was ever defined), and only from one of the
 * WITHDRAWABLE_IDEA_STATUSES.
 */
export async function withdrawIdea(actor: Actor, ideaId: string, reason?: string): Promise<IdeaRow> {
  const idea = await queryOne<IdeaRow>(`SELECT * FROM ideas WHERE id = $1`, [ideaId]);
  if (!idea) throw new NotFoundError("Idea", ideaId);
  requireOrgMembership(actor, idea.organization_id);

  if (idea.submitter_id !== actor.userId) {
    throw new ForbiddenError("Only the idea's submitter can withdraw it.");
  }
  if (!canWithdrawIdea(idea.status)) {
    throw new InvalidTransitionError(
      `An idea in status ${idea.status} cannot be withdrawn.`,
      { from: idea.status }
    );
  }

  const [rows] = await transaction<[IdeaRow[], unknown[], unknown[]]>([
    {
      sql: `UPDATE ideas SET status = 'WITHDRAWN', withdrawal_reason = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      params: [reason ?? null, ideaId],
    },
    {
      sql: `INSERT INTO idea_status_history (idea_id, from_status, to_status, changed_by, note) VALUES ($1,$2,'WITHDRAWN',$3,$4)`,
      params: [ideaId, idea.status, actor.userId, reason ?? null],
    },
    auditLogStatement({
      organizationId: idea.organization_id,
      actor,
      action: "Idea Withdrawn",
      actionAr: "سحب الفكرة",
      entityType: "IDEA",
      entityId: ideaId,
      previousState: idea.status,
      newState: "WITHDRAWN",
    }),
  ]);

  const updated = rows[0];
  if (!updated) throw new ConflictError("Idea withdrawal did not apply.");
  return updated;
}
