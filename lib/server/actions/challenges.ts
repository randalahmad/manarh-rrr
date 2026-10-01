"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { uuid } from "@/lib/server/validation/schemas";
import {
  listChallengesForOrganization,
  createChallenge,
  archiveChallenge,
  type ChallengeRow,
} from "@/lib/server/services/challenges";

const listSchema = z.object({ organizationId: uuid });
const createSchema = z.object({
  organizationId: uuid,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  strategicGoalId: uuid.optional(),
  priority: z.number().int().optional(),
});
const archiveSchema = z.object({ challengeId: uuid });

export async function listChallengesAction(input: unknown): Promise<ActionResult<ChallengeRow[]>> {
  return runAction(async () => {
    const { organizationId } = listSchema.parse(input);
    const actor = await requireActiveUser();
    return listChallengesForOrganization(actor, organizationId);
  });
}

export async function createChallengeAction(input: unknown): Promise<ActionResult<ChallengeRow>> {
  return runAction(async () => {
    const parsed = createSchema.parse(input);
    const actor = await requireActiveUser();
    return createChallenge(actor, parsed);
  });
}

export async function archiveChallengeAction(input: unknown): Promise<ActionResult<ChallengeRow>> {
  return runAction(async () => {
    const { challengeId } = archiveSchema.parse(input);
    const actor = await requireActiveUser();
    return archiveChallenge(actor, challengeId);
  });
}
