/**
 * Client-side data layer for the Org Admin Challenges page
 * (`app/org/challenges/page.tsx`). Mirrors lib/client/org-strategic-goals.ts's
 * pattern. `categoryIds` has no populated real join-table read yet (same
 * documented gap as elsewhere) — always `[]` for a real challenge.
 */
import type { InnovationChallenge } from "@/lib/types";
import {
  listChallengesAction,
  createChallengeAction,
  archiveChallengeAction,
} from "@/lib/mock-server/actions/challenges";
import type { ChallengeRow } from "@/lib/server/services/challenges";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

function mapChallengeRow(row: ChallengeRow): InnovationChallenge {
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

export async function fetchOrgChallenges(organizationId: string): Promise<InnovationChallenge[]> {
  const rows = unwrap(await listChallengesAction({ organizationId }));
  return rows.map(mapChallengeRow);
}

export async function createOrgChallenge(input: {
  organizationId: string;
  title: string;
  description: string;
  strategicGoalId?: string;
  priority?: number;
}): Promise<InnovationChallenge> {
  return mapChallengeRow(unwrap(await createChallengeAction(input)));
}

export async function archiveOrgChallenge(challengeId: string): Promise<InnovationChallenge> {
  return mapChallengeRow(unwrap(await archiveChallengeAction({ challengeId })));
}
