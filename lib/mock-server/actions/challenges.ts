"use server";
import { ok } from "@/lib/mock-server/result";
import { challengeRows } from "@/lib/mock-server/fixtures";

type Rec = Record<string, unknown>;

export async function listChallengesAction(_input: unknown) {
  return ok(challengeRows);
}

export async function createChallengeAction(input: unknown) {
  const i = (input ?? {}) as Rec;
  return ok({ ...challengeRows[0], ...i, id: `challenge-mock-${Date.now()}`, status: "OPEN" as const });
}

export async function archiveChallengeAction(input: unknown) {
  const { challengeId, id } = (input ?? {}) as { challengeId?: string; id?: string };
  const found = challengeRows.find((r) => r.id === (challengeId ?? id)) ?? challengeRows[0];
  return ok({ ...found, status: "ARCHIVED" as const });
}
