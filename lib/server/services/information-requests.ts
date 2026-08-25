/**
 * Information Requests domain service (Phase 6, Group B addition).
 *
 * `information_requests` is a real Phase 4 table with no Phase 5 service.
 * Backs the "طلب استكمال معلومات" (request more information) action on the
 * Innovation Specialist and Org Admin idea-detail pages, and the
 * Innovator's response flow. The idea-status half of this (NEEDS_INFORMATION
 * / RETURNED_FOR_REVIEW) uses exactly the existing canonical graph in
 * lib/server/workflow/idea-status.ts — no new transitions are introduced:
 * creating a request only succeeds when the idea's current status already
 * legally transitions to NEEDS_INFORMATION, and responding only succeeds
 * from NEEDS_INFORMATION, moving to RETURNED_FOR_REVIEW (the graph's only
 * outgoing edge from NEEDS_INFORMATION) — NOT to UNDER_REVIEW, which the
 * innovator-side mock's respondToInformationRequest uses but which is not a
 * legal edge in the approved canonical graph.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requirePermission, requireOrgMembership } from "@/lib/server/auth/guards";
import { NotFoundError, ForbiddenError, ConflictError, InvalidTransitionError } from "@/lib/server/errors";
import { canTransitionIdea } from "@/lib/server/workflow/idea-status";
import { auditLogStatement } from "@/lib/server/audit";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { IdeaRow } from "@/lib/server/services/ideas";

export interface InformationRequestRow {
  id: string;
  idea_id: string;
  requested_by: string;
  request_text: string;
  status: "OPEN" | "RESPONDED" | "CLOSED";
  response_text: string | null;
  responded_by: string | null;
  requested_at: string;
  responded_at: string | null;
}

/**
 * Staff-initiated (Specialist/Org Admin) — same permission as any other
 * idea-status-affecting action: IDEA:EDIT in the idea's organization,
 * matching transitionIdeaStatus's own gate exactly, since this both
 * creates a request record AND moves the idea's status.
 */
export async function createInformationRequest(
  actor: Actor,
  ideaId: string,
  requestText: string
): Promise<InformationRequestRow> {
  const idea = await queryOne<IdeaRow>(`SELECT * FROM ideas WHERE id = $1`, [ideaId]);
  if (!idea) throw new NotFoundError("Idea", ideaId);
  requirePermission(actor, idea.organization_id, "IDEA", "EDIT");

  if (!canTransitionIdea(idea.status, "NEEDS_INFORMATION")) {
    throw new InvalidTransitionError(
      `Cannot request information on an idea in status ${idea.status}.`,
      { from: idea.status, to: "NEEDS_INFORMATION" }
    );
  }

  const [rows] = await transaction<[InformationRequestRow[], unknown[], unknown[], unknown[]]>([
    {
      sql: `
        INSERT INTO information_requests (idea_id, requested_by, request_text)
        VALUES ($1,$2,$3)
        RETURNING *
      `,
      params: [ideaId, actor.userId, requestText],
    },
    {
      sql: `UPDATE ideas SET status = 'NEEDS_INFORMATION', updated_at = now() WHERE id = $1`,
      params: [ideaId],
    },
    {
      sql: `INSERT INTO idea_status_history (idea_id, from_status, to_status, changed_by, note) VALUES ($1,$2,'NEEDS_INFORMATION',$3,$4)`,
      params: [ideaId, idea.status, actor.userId, requestText],
    },
    auditLogStatement({
      organizationId: idea.organization_id,
      actor,
      action: "Information Requested",
      actionAr: "طلب استكمال معلومات",
      entityType: "IDEA",
      entityId: ideaId,
      previousState: idea.status,
      newState: "NEEDS_INFORMATION",
      permissionSnapshot: "IDEA:EDIT",
    }),
  ]);

  const request = rows[0];
  if (!request) throw new ConflictError("Failed to create information request.");
  return request;
}

/**
 * Innovator-initiated — only the idea's own submitter may respond, same
 * ownership shape as withdrawIdea/updateIdea. Moves the idea to
 * RETURNED_FOR_REVIEW, the only legal edge out of NEEDS_INFORMATION.
 */
export async function respondToInformationRequest(
  actor: Actor,
  requestId: string,
  responseText: string
): Promise<InformationRequestRow> {
  const request = await queryOne<InformationRequestRow>(
    `SELECT * FROM information_requests WHERE id = $1`,
    [requestId]
  );
  if (!request) throw new NotFoundError("Information request", requestId);

  const idea = await queryOne<IdeaRow>(`SELECT * FROM ideas WHERE id = $1`, [request.idea_id]);
  if (!idea) throw new NotFoundError("Idea", request.idea_id);
  requireOrgMembership(actor, idea.organization_id);

  if (idea.submitter_id !== actor.userId) {
    throw new ForbiddenError("Only the idea's submitter can respond to an information request.");
  }
  if (request.status !== "OPEN") {
    throw new ConflictError(`This information request is already ${request.status}.`);
  }
  if (!canTransitionIdea(idea.status, "RETURNED_FOR_REVIEW")) {
    throw new InvalidTransitionError(
      `Cannot respond to an information request while the idea is in status ${idea.status}.`,
      { from: idea.status, to: "RETURNED_FOR_REVIEW" }
    );
  }

  const [rows] = await transaction<[InformationRequestRow[], unknown[], unknown[], unknown[]]>([
    {
      sql: `
        UPDATE information_requests
        SET status = 'RESPONDED', response_text = $1, responded_by = $2, responded_at = now()
        WHERE id = $3
        RETURNING *
      `,
      params: [responseText, actor.userId, requestId],
    },
    {
      sql: `UPDATE ideas SET status = 'RETURNED_FOR_REVIEW', updated_at = now() WHERE id = $1`,
      params: [idea.id],
    },
    {
      sql: `INSERT INTO idea_status_history (idea_id, from_status, to_status, changed_by, note) VALUES ($1,$2,'RETURNED_FOR_REVIEW',$3,$4)`,
      params: [idea.id, idea.status, actor.userId, responseText],
    },
    auditLogStatement({
      organizationId: idea.organization_id,
      actor,
      action: "Information Request Responded",
      actionAr: "الرد على طلب استكمال المعلومات",
      entityType: "IDEA",
      entityId: idea.id,
      previousState: idea.status,
      newState: "RETURNED_FOR_REVIEW",
    }),
  ]);

  const updated = rows[0];
  if (!updated) throw new ConflictError("Information request response did not apply.");
  return updated;
}

export async function listInformationRequestsForIdea(
  actor: Actor,
  ideaId: string
): Promise<InformationRequestRow[]> {
  const idea = await queryOne<IdeaRow>(`SELECT * FROM ideas WHERE id = $1`, [ideaId]);
  if (!idea) throw new NotFoundError("Idea", ideaId);
  requireOrgMembership(actor, idea.organization_id);
  return query<InformationRequestRow>(
    `SELECT * FROM information_requests WHERE idea_id = $1 ORDER BY requested_at DESC`,
    [ideaId]
  );
}

/**
 * Final QA audit fix (Critical Issue 3) — every information request across
 * the organization, for the standalone Org Admin page
 * (`app/org/information-requests/page.tsx`), which previously read the
 * whole mock `informationRequests` array and let a staff member "respond"
 * with no backend behind it. Org-scoped the same way
 * `listEvaluationsForOrganization` (evaluations.ts) scopes EVALUATION:
 * join to `ideas` for the organization_id filter, since
 * `information_requests` itself carries no organization_id column.
 * Read-only, same requireOrgMembership-only gate as
 * `listInformationRequestsForIdea` (no narrower permission exists for this
 * read in the approved catalog).
 */
export async function listInformationRequestsForOrganization(
  actor: Actor,
  organizationId: string
): Promise<InformationRequestRow[]> {
  requireOrgMembership(actor, organizationId);
  return query<InformationRequestRow>(
    `
    SELECT ir.* FROM information_requests ir
    JOIN ideas i ON i.id = ir.idea_id
    WHERE i.organization_id = $1
    ORDER BY ir.requested_at DESC
    `,
    [organizationId]
  );
}
