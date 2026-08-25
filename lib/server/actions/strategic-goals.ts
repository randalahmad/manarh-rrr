"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import {
  createStrategicGoalSchema,
  updateStrategicGoalSchema,
  listStrategicGoalsSchema,
} from "@/lib/server/validation/schemas";
import {
  createStrategicGoal,
  updateStrategicGoal,
  listStrategicGoals,
  type StrategicGoalRow,
} from "@/lib/server/services/strategic-goals";

export async function createStrategicGoalAction(input: unknown): Promise<ActionResult<StrategicGoalRow>> {
  return runAction(async () => {
    const parsed = createStrategicGoalSchema.parse(input);
    const actor = await requireActiveUser();
    return createStrategicGoal(actor, parsed);
  });
}

export async function updateStrategicGoalAction(input: unknown): Promise<ActionResult<StrategicGoalRow>> {
  return runAction(async () => {
    const parsed = updateStrategicGoalSchema.parse(input);
    const actor = await requireActiveUser();
    const { goalId, ...patch } = parsed;
    return updateStrategicGoal(actor, goalId, patch);
  });
}

export async function listStrategicGoalsAction(input: unknown): Promise<ActionResult<StrategicGoalRow[]>> {
  return runAction(async () => {
    const parsed = listStrategicGoalsSchema.parse(input);
    const actor = await requireActiveUser();
    return listStrategicGoals(actor, parsed.organizationId);
  });
}
