"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import {
  createInformationRequestSchema,
  respondToInformationRequestSchema,
  listInformationRequestsSchema,
  listInformationRequestsForOrganizationSchema,
} from "@/lib/server/validation/schemas";
import {
  createInformationRequest,
  respondToInformationRequest,
  listInformationRequestsForIdea,
  listInformationRequestsForOrganization,
  type InformationRequestRow,
} from "@/lib/server/services/information-requests";

export async function createInformationRequestAction(
  input: unknown
): Promise<ActionResult<InformationRequestRow>> {
  return runAction(async () => {
    const parsed = createInformationRequestSchema.parse(input);
    const actor = await requireActiveUser();
    return createInformationRequest(actor, parsed.ideaId, parsed.requestText);
  });
}

export async function respondToInformationRequestAction(
  input: unknown
): Promise<ActionResult<InformationRequestRow>> {
  return runAction(async () => {
    const parsed = respondToInformationRequestSchema.parse(input);
    const actor = await requireActiveUser();
    return respondToInformationRequest(actor, parsed.requestId, parsed.responseText);
  });
}

export async function listInformationRequestsAction(
  input: unknown
): Promise<ActionResult<InformationRequestRow[]>> {
  return runAction(async () => {
    const parsed = listInformationRequestsSchema.parse(input);
    const actor = await requireActiveUser();
    return listInformationRequestsForIdea(actor, parsed.ideaId);
  });
}

export async function listInformationRequestsForOrganizationAction(
  input: unknown
): Promise<ActionResult<InformationRequestRow[]>> {
  return runAction(async () => {
    const parsed = listInformationRequestsForOrganizationSchema.parse(input);
    const actor = await requireActiveUser();
    return listInformationRequestsForOrganization(actor, parsed.organizationId);
  });
}
