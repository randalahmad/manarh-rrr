/**
 * Client-side data layer for the standalone Org Admin Information Requests
 * page (`app/org/information-requests/page.tsx`) — Final QA audit fix
 * (Critical Issue 3: `docs/architecture/manarah-final-integration-audit.md`
 * §16).
 *
 * The page previously read the mock `d.informationRequests` array and let
 * a staff member "respond" via the pure-mock `d.respondToInformationRequest`
 * — nothing was persisted, and the innovator never received the reply.
 * The real `respondToInformationRequest` service (lib/server/services/
 * information-requests.ts, live since Group B) only ever allows the
 * idea's own submitter to respond — no staff role, including ORG_ADMIN,
 * can call it successfully (see that function's ownership check). That is
 * NOT a gap introduced here: it is the same real, already-tested,
 * already-approved business rule the Innovator interface's own response
 * form (CompleteInformationForm.tsx) already exercises. So this page
 * cannot legitimately offer a "staff responds" affordance without
 * inventing a business rule that doesn't exist on the backend — instead it
 * becomes a real, org-wide, READ-ONLY monitoring view: every request
 * across the organization, its real status, and the innovator's real
 * response once they've answered. Creating a request already has a real
 * home (the per-idea Org Admin/Specialist pages); this page never had
 * create UI either, so none is added here.
 *
 * Mirrors lib/client/org-strategic-goals.ts's pattern: a narrow, additive
 * data source backed by real Server Actions, used only by this page.
 */
import type { InformationRequest } from "@/lib/types";
import { listInformationRequestsForOrganizationAction } from "@/lib/server/actions/information-requests";
import { listIdeasAction } from "@/lib/server/actions/ideas";
import type { InformationRequestRow } from "@/lib/server/services/information-requests";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

export function mapInformationRequestRow(row: InformationRequestRow): InformationRequest {
  return {
    id: row.id,
    ideaId: row.idea_id,
    requestedBy: row.requested_by,
    requestText: row.request_text,
    status: row.status,
    requestedAt: row.requested_at,
    responseText: row.response_text ?? undefined,
    respondedBy: row.responded_by ?? undefined,
    respondedAt: row.responded_at ?? undefined,
  };
}

export interface OrgInformationRequestsData {
  requests: InformationRequest[];
  ideaTitles: Map<string, string>;
}

export async function fetchOrgInformationRequests(organizationId: string): Promise<OrgInformationRequestsData> {
  const [requestRows, ideaRows] = await Promise.all([
    listInformationRequestsForOrganizationAction({ organizationId }).then(unwrap),
    listIdeasAction({ organizationId }).then(unwrap),
  ]);
  return {
    requests: requestRows.map(mapInformationRequestRow),
    ideaTitles: new Map(ideaRows.map((idea) => [idea.id, idea.title])),
  };
}
