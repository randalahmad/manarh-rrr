"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { uuid } from "@/lib/server/validation/schemas";
import {
  listOpportunitiesForOrganization,
  createOpportunity,
  archiveOpportunity,
  type OpportunityRow,
} from "@/lib/server/services/opportunities";

const listSchema = z.object({ organizationId: uuid });
const createSchema = z.object({
  organizationId: uuid,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  strategicGoalId: uuid.optional(),
  priority: z.number().int().optional(),
});
const archiveSchema = z.object({ opportunityId: uuid });

export async function listOpportunitiesAction(input: unknown): Promise<ActionResult<OpportunityRow[]>> {
  return runAction(async () => {
    const { organizationId } = listSchema.parse(input);
    const actor = await requireActiveUser();
    return listOpportunitiesForOrganization(actor, organizationId);
  });
}

export async function createOpportunityAction(input: unknown): Promise<ActionResult<OpportunityRow>> {
  return runAction(async () => {
    const parsed = createSchema.parse(input);
    const actor = await requireActiveUser();
    return createOpportunity(actor, parsed);
  });
}

export async function archiveOpportunityAction(input: unknown): Promise<ActionResult<OpportunityRow>> {
  return runAction(async () => {
    const { opportunityId } = archiveSchema.parse(input);
    const actor = await requireActiveUser();
    return archiveOpportunity(actor, opportunityId);
  });
}
