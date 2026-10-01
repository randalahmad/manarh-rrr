"use server";
import { ok } from "@/lib/mock-server/result";
import { strategicGoalRows } from "@/lib/mock-server/fixtures";

type Rec = Record<string, unknown>;

export async function createStrategicGoalAction(input: unknown) {
  const i = (input ?? {}) as Rec;
  return ok({ ...strategicGoalRows[0], ...i, id: `goal-mock-${Date.now()}` });
}

export async function updateStrategicGoalAction(input: unknown) {
  const { strategicGoalId, id, ...rest } = (input ?? {}) as Rec & { strategicGoalId?: string; id?: string };
  const found = strategicGoalRows.find((r) => r.id === (strategicGoalId ?? id)) ?? strategicGoalRows[0];
  return ok({ ...found, ...rest });
}

export async function listStrategicGoalsAction(_input: unknown) {
  return ok(strategicGoalRows);
}
