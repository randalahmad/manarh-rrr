/**
 * Client-side data layer for the Org Admin Opportunities page
 * (`app/org/opportunities/page.tsx`). Mirrors lib/client/org-challenges.ts.
 */
import type { InnovationOpportunity } from "@/lib/types";
import {
  listOpportunitiesAction,
  createOpportunityAction,
  archiveOpportunityAction,
} from "@/lib/mock-server/actions/opportunities";
import type { OpportunityRow } from "@/lib/server/services/opportunities";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

function mapOpportunityRow(row: OpportunityRow): InnovationOpportunity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    status: row.status,
    strategicGoalId: row.strategic_goal_id ?? undefined,
    categoryIds: [],
    priority: row.priority ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    linkedIdeasCount: row.linked_ideas_count,
    usageCount: row.usage_count,
  };
}

export async function fetchOrgOpportunities(organizationId: string): Promise<InnovationOpportunity[]> {
  const rows = unwrap(await listOpportunitiesAction({ organizationId }));
  return rows.map(mapOpportunityRow);
}

export async function createOrgOpportunity(input: {
  organizationId: string;
  title: string;
  description: string;
  strategicGoalId?: string;
  priority?: number;
}): Promise<InnovationOpportunity> {
  return mapOpportunityRow(unwrap(await createOpportunityAction(input)));
}

export async function archiveOrgOpportunity(opportunityId: string): Promise<InnovationOpportunity> {
  return mapOpportunityRow(unwrap(await archiveOpportunityAction({ opportunityId })));
}
