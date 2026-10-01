"use server";
import { ok } from "@/lib/mock-server/result";
import { informationRequestRows } from "@/lib/mock-server/fixtures";

export async function createInformationRequestAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...informationRequestRows[0], ...i, id: `ir-mock-${Date.now()}`, status: "OPEN" as const });
}

export async function respondToInformationRequestAction(input: unknown) {
  const { requestId, id, responseText } = (input ?? {}) as { requestId?: string; id?: string; responseText?: string };
  const found = informationRequestRows.find((r) => r.id === (requestId ?? id)) ?? informationRequestRows[0];
  return ok({ ...found, status: "RESPONDED" as const, response_text: responseText ?? "تم الرد." });
}

export async function listInformationRequestsAction(input: unknown) {
  const { ideaId } = (input ?? {}) as { ideaId?: string };
  return ok(informationRequestRows.filter((r) => !ideaId || r.idea_id === ideaId));
}

export async function listInformationRequestsForOrganizationAction(_input: unknown) {
  return ok(informationRequestRows);
}
