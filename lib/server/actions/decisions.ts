"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import {
  submitRecommendationSchema,
  makeDecisionSchema,
  getIdeaSchema,
  organizationScopeSchema,
} from "@/lib/server/validation/schemas";
import {
  submitRecommendation,
  makeDecision,
  listRecommendationsForIdea,
  listRecommendationsForOrganization,
  listDecisionsForIdea,
  listDecisionsForOrganization,
  type RecommendationRow,
  type DecisionRow,
} from "@/lib/server/services/decisions";

export async function submitRecommendationAction(input: unknown): Promise<ActionResult<RecommendationRow>> {
  return runAction(async () => {
    const parsed = submitRecommendationSchema.parse(input);
    const actor = await requireActiveUser();
    return submitRecommendation(actor, parsed);
  });
}

export async function makeDecisionAction(input: unknown): Promise<ActionResult<DecisionRow>> {
  return runAction(async () => {
    const parsed = makeDecisionSchema.parse(input);
    const actor = await requireActiveUser();
    return makeDecision(actor, parsed);
  });
}

/**
 * Read actions (Phase 6, Group C addition). See lib/server/actions/ideas.ts
 * for the pattern rationale. Note: under the real seeded RBAC catalog
 * (db/migrations/0010_rbac_seed.sql), only ORG_ADMIN holds GOVERNANCE:VIEW —
 * INNOVATION_SPECIALIST and EVALUATOR do not — so these will return
 * FORBIDDEN for anyone but an org admin. That is the approved Group C
 * decision, not a bug: recommendation/decision authority stays with
 * ORG_ADMIN under the current, unmodified permission catalog.
 */
export async function listRecommendationsForIdeaAction(
  input: unknown
): Promise<ActionResult<RecommendationRow[]>> {
  return runAction(async () => {
    const parsed = getIdeaSchema.parse(input);
    const actor = await requireActiveUser();
    return listRecommendationsForIdea(actor, parsed.ideaId);
  });
}

export async function listRecommendationsForOrganizationAction(
  input: unknown
): Promise<ActionResult<RecommendationRow[]>> {
  return runAction(async () => {
    const parsed = organizationScopeSchema.parse(input);
    const actor = await requireActiveUser();
    return listRecommendationsForOrganization(actor, parsed.organizationId);
  });
}

export async function listDecisionsForIdeaAction(input: unknown): Promise<ActionResult<DecisionRow[]>> {
  return runAction(async () => {
    const parsed = getIdeaSchema.parse(input);
    const actor = await requireActiveUser();
    return listDecisionsForIdea(actor, parsed.ideaId);
  });
}

export async function listDecisionsForOrganizationAction(
  input: unknown
): Promise<ActionResult<DecisionRow[]>> {
  return runAction(async () => {
    const parsed = organizationScopeSchema.parse(input);
    const actor = await requireActiveUser();
    return listDecisionsForOrganization(actor, parsed.organizationId);
  });
}
