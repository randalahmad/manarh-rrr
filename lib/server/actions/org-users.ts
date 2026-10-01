"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { uuid } from "@/lib/server/validation/schemas";
import {
  listOrgMembers,
  getOrgMemberByUserId,
  updateOrgMembership,
  setMemberAccountStatus,
  type OrgMemberRow,
} from "@/lib/server/services/org-users";

const userRole = z.enum([
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "INNOVATION_SPECIALIST",
  "INTERNAL_INNOVATOR",
  "EXTERNAL_INNOVATOR",
  "EVALUATOR",
  "PROJECT_MANAGER",
]);
const accountStatus = z.enum(["ACTIVE", "SUSPENDED", "DISABLED", "PENDING_ACTIVATION"]);

const listSchema = z.object({ organizationId: uuid });
const getSchema = z.object({ organizationId: uuid, userId: uuid });
const updateSchema = z.object({
  organizationId: uuid,
  userId: uuid,
  role: userRole.optional(),
  department: z.string().trim().nullable().optional(),
});
const statusSchema = z.object({
  organizationId: uuid,
  userId: uuid,
  status: accountStatus,
  reason: z.string().trim().optional(),
});

export async function listOrgMembersAction(input: unknown): Promise<ActionResult<OrgMemberRow[]>> {
  return runAction(async () => {
    const { organizationId } = listSchema.parse(input);
    const actor = await requireActiveUser();
    return listOrgMembers(actor, organizationId);
  });
}

export async function getOrgMemberAction(input: unknown): Promise<ActionResult<OrgMemberRow>> {
  return runAction(async () => {
    const { organizationId, userId } = getSchema.parse(input);
    const actor = await requireActiveUser();
    return getOrgMemberByUserId(actor, organizationId, userId);
  });
}

export async function updateOrgMembershipAction(input: unknown): Promise<ActionResult<OrgMemberRow>> {
  return runAction(async () => {
    const { organizationId, userId, ...patch } = updateSchema.parse(input);
    const actor = await requireActiveUser();
    const member = await getOrgMemberByUserId(actor, organizationId, userId);
    return updateOrgMembership(actor, member.membership_id, patch);
  });
}

export async function setMemberAccountStatusAction(input: unknown): Promise<ActionResult<OrgMemberRow>> {
  return runAction(async () => {
    const { organizationId, userId, status, reason } = statusSchema.parse(input);
    const actor = await requireActiveUser();
    const member = await getOrgMemberByUserId(actor, organizationId, userId);
    return setMemberAccountStatus(actor, member.membership_id, status, reason);
  });
}
