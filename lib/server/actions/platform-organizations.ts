"use server";

/**
 * Server Actions for platform-level organization management — Super Admin
 * minimal implementation (Phase 6). Every action here calls
 * requireActiveUser() (a valid, active session — same baseline as every
 * other mutation-performing action) and then delegates to the service
 * layer, which itself calls requirePlatformAdmin() before touching
 * anything. This file adds no authorization logic of its own — see
 * lib/server/services/platform-organizations.ts for the actual checks.
 */
import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import {
  createPlatformOrganizationSchema,
  platformOrganizationIdSchema,
  bootstrapOrgAdminSchema,
} from "@/lib/server/validation/schemas";
import {
  listAllOrganizations,
  getOrganizationDetail,
  createOrganization,
  suspendOrganization,
  reactivateOrganization,
  bootstrapOrgAdmin,
  type PlatformOrganizationSummary,
  type PlatformOrganizationDetail,
  type BootstrapOrgAdminResult,
} from "@/lib/server/services/platform-organizations";

export async function listPlatformOrganizationsAction(): Promise<ActionResult<PlatformOrganizationSummary[]>> {
  return runAction(async () => {
    const actor = await requireActiveUser();
    return listAllOrganizations(actor);
  });
}

export async function getPlatformOrganizationDetailAction(
  input: unknown
): Promise<ActionResult<PlatformOrganizationDetail>> {
  return runAction(async () => {
    const parsed = platformOrganizationIdSchema.parse(input);
    const actor = await requireActiveUser();
    return getOrganizationDetail(actor, parsed.organizationId);
  });
}

export async function createPlatformOrganizationAction(
  input: unknown
): Promise<ActionResult<PlatformOrganizationDetail>> {
  return runAction(async () => {
    const parsed = createPlatformOrganizationSchema.parse(input);
    const actor = await requireActiveUser();
    return createOrganization(actor, parsed);
  });
}

export async function suspendPlatformOrganizationAction(
  input: unknown
): Promise<ActionResult<PlatformOrganizationSummary>> {
  return runAction(async () => {
    const parsed = platformOrganizationIdSchema.parse(input);
    const actor = await requireActiveUser();
    return suspendOrganization(actor, parsed.organizationId);
  });
}

export async function reactivatePlatformOrganizationAction(
  input: unknown
): Promise<ActionResult<PlatformOrganizationSummary>> {
  return runAction(async () => {
    const parsed = platformOrganizationIdSchema.parse(input);
    const actor = await requireActiveUser();
    return reactivateOrganization(actor, parsed.organizationId);
  });
}

export async function bootstrapOrgAdminAction(input: unknown): Promise<ActionResult<BootstrapOrgAdminResult>> {
  return runAction(async () => {
    const parsed = bootstrapOrgAdminSchema.parse(input);
    const actor = await requireActiveUser();
    return bootstrapOrgAdmin(actor, parsed);
  });
}
