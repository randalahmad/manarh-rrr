"use server";
import { ok } from "@/lib/mock-server/result";
import { projectRows, orgMemberRows } from "@/lib/mock-server/fixtures";

type Rec = Record<string, unknown>;

export async function createProjectFromIdeaAction(input: unknown) {
  const i = (input ?? {}) as Rec;
  return ok({ ...projectRows[0], ...i, id: `proj-mock-${Date.now()}`, status: "PLANNING" as const });
}

export async function transitionProjectStatusAction(input: unknown) {
  const { projectId, id, toStatus } = (input ?? {}) as { projectId?: string; id?: string; toStatus?: string };
  const found = projectRows.find((r) => r.id === (projectId ?? id)) ?? projectRows[0];
  return ok({ ...found, status: (toStatus as typeof found.status) ?? found.status });
}

export async function updateProjectDetailsAction(input: unknown) {
  const { projectId, id, ...rest } = (input ?? {}) as Rec & { projectId?: string; id?: string };
  const found = projectRows.find((r) => r.id === (projectId ?? id)) ?? projectRows[0];
  return ok({ ...found, ...rest });
}

export async function archiveProjectAction(input: unknown) {
  const { projectId, id } = (input ?? {}) as { projectId?: string; id?: string };
  const found = projectRows.find((r) => r.id === (projectId ?? id)) ?? projectRows[0];
  return ok({ ...found, status: "ARCHIVED" as const });
}

export async function getProjectAction(input: unknown) {
  const { projectId, id } = (input ?? {}) as { projectId?: string; id?: string };
  const found = projectRows.find((r) => r.id === (projectId ?? id)) ?? projectRows[0];
  return ok(found);
}

export async function listProjectsAction(_input: unknown) {
  return ok(projectRows);
}

export async function listProjectOwnerCandidatesAction(_input: unknown) {
  return ok(
    orgMemberRows
      .filter((u) => ["PROJECT_MANAGER", "INNOVATION_SPECIALIST", "ORG_ADMIN"].includes(u.role))
      .map((u) => ({ id: u.user_id, fullName: u.full_name }))
  );
}
