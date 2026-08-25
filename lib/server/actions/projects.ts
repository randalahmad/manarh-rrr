"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import {
  createProjectSchema,
  transitionProjectSchema,
  updateProjectDetailsSchema,
  archiveProjectSchema,
  getProjectSchema,
  listProjectsSchema,
  organizationScopeSchema,
} from "@/lib/server/validation/schemas";
import {
  createProjectFromIdea,
  transitionProjectStatus,
  updateProjectDetails,
  archiveProject,
  getProjectById,
  listProjectsForOrganization,
  listProjectOwnerCandidates,
  type ProjectRow,
  type ProjectOwnerCandidate,
} from "@/lib/server/services/projects";

export async function createProjectFromIdeaAction(input: unknown): Promise<ActionResult<ProjectRow>> {
  return runAction(async () => {
    const parsed = createProjectSchema.parse(input);
    const actor = await requireActiveUser();
    return createProjectFromIdea(actor, parsed);
  });
}

export async function transitionProjectStatusAction(input: unknown): Promise<ActionResult<ProjectRow>> {
  return runAction(async () => {
    const parsed = transitionProjectSchema.parse(input);
    const actor = await requireActiveUser();
    return transitionProjectStatus(actor, parsed.projectId, parsed.toStatus);
  });
}

export async function updateProjectDetailsAction(input: unknown): Promise<ActionResult<ProjectRow>> {
  return runAction(async () => {
    const parsed = updateProjectDetailsSchema.parse(input);
    const actor = await requireActiveUser();
    const { projectId, ...patch } = parsed;
    return updateProjectDetails(actor, projectId, patch);
  });
}

export async function archiveProjectAction(input: unknown): Promise<ActionResult<ProjectRow>> {
  return runAction(async () => {
    const parsed = archiveProjectSchema.parse(input);
    const actor = await requireActiveUser();
    return archiveProject(actor, parsed.projectId);
  });
}

/**
 * Read actions (Phase 6, Group D addition) — Phase 5 built the projects
 * service with only enough reads for its own mutation flows (the UNIQUE
 * idea_id check, etc.); nothing exposed a read to any Server Action
 * boundary yet. Mirrors the read-action pattern already established in
 * lib/server/actions/ideas.ts and evaluations.ts.
 */
export async function getProjectAction(input: unknown): Promise<ActionResult<ProjectRow>> {
  return runAction(async () => {
    const parsed = getProjectSchema.parse(input);
    const actor = await requireActiveUser();
    return getProjectById(actor, parsed.projectId);
  });
}

export async function listProjectsAction(input: unknown): Promise<ActionResult<ProjectRow[]>> {
  return runAction(async () => {
    const parsed = listProjectsSchema.parse(input);
    const actor = await requireActiveUser();
    const { organizationId, ...filters } = parsed;
    return listProjectsForOrganization(actor, organizationId, filters);
  });
}

export async function listProjectOwnerCandidatesAction(
  input: unknown
): Promise<ActionResult<ProjectOwnerCandidate[]>> {
  return runAction(async () => {
    const parsed = organizationScopeSchema.parse(input);
    const actor = await requireActiveUser();
    return listProjectOwnerCandidates(actor, parsed.organizationId);
  });
}
