"use server";
import { ok } from "@/lib/mock-server/result";
import { setMockRole, clearMockRole, getMockRoleOrNull, mockIdentityFor, type MockRole } from "@/lib/mock-server/session";

type SessionRole = "SUPER_ADMIN" | "ORG_ADMIN" | "INNOVATION_SPECIALIST" | "INTERNAL_INNOVATOR" | "EXTERNAL_INNOVATOR" | "EVALUATOR" | "PROJECT_MANAGER";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  organizationId: string | null;
  role: SessionRole | null;
}

const ROLE_ORG: Record<MockRole, string | null> = {
  ORG_ADMIN: "org-001",
  INNOVATION_SPECIALIST: "org-001",
  INTERNAL_INNOVATOR: "org-001",
  SUPER_ADMIN: null,
};

export async function signInAction(input: unknown) {
  const { role } = (input ?? {}) as { email?: string; password?: string; role?: MockRole };
  await setMockRole(role ?? "ORG_ADMIN");
  const identity = mockIdentityFor(role ?? "ORG_ADMIN");
  return ok<SessionUser>({
    id: identity.id,
    email: identity.email,
    name: identity.name,
    avatarUrl: null,
    organizationId: ROLE_ORG[role ?? "ORG_ADMIN"],
    role: role ?? "ORG_ADMIN",
  });
}

export async function signOutAction() {
  await clearMockRole();
  return ok(null);
}

export async function getSessionUserAction() {
  const role = await getMockRoleOrNull();
  if (!role) return ok<SessionUser | null>(null);
  const identity = mockIdentityFor(role);
  return ok<SessionUser>({
    id: identity.id,
    email: identity.email,
    name: identity.name,
    avatarUrl: null,
    organizationId: ROLE_ORG[role],
    role,
  });
}
