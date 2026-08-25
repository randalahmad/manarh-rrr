"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import {
  listActiveOrganizations,
  listMyOrganizations,
  getMyRoleInOrganization,
  type OrganizationSummary,
  type MyOrganizationSummary,
} from "@/lib/server/services/organizations";
import type { ActorMembership } from "@/lib/server/rbac/permissions";
import { z } from "zod";

export async function listOrganizationsAction(): Promise<ActionResult<OrganizationSummary[]>> {
  return runAction(async () => {
    const actor = await requireActiveUser();
    return listActiveOrganizations(actor);
  });
}

export async function listMyOrganizationsAction(): Promise<ActionResult<MyOrganizationSummary[]>> {
  return runAction(async () => {
    const actor = await requireActiveUser();
    return listMyOrganizations(actor);
  });
}

const getMyRoleSchema = z.object({ organizationId: z.string().uuid() });

export async function getMyRoleInOrganizationAction(
  input: unknown
): Promise<ActionResult<ActorMembership["role"] | null>> {
  return runAction(async () => {
    const parsed = getMyRoleSchema.parse(input);
    const actor = await requireActiveUser();
    return getMyRoleInOrganization(actor, parsed.organizationId);
  });
}
