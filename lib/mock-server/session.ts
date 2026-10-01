/**
 * Frontend-only prototype: mock session state. No Neon Auth, no DATABASE_URL
 * anywhere in this module. A single cookie carries which of the four
 * interfaces the visitor is previewing.
 */
import { cookies } from "next/headers";
import type { Actor, ActorMembership } from "@/lib/server/rbac/permissions";
import type { PermissionArea, PermissionAction } from "@/lib/types";
import { ORG_ID, currentUser, users } from "@/lib/mock-data/seed";

export const MOCK_ROLE_COOKIE = "mrh_mock_role";

export type MockRole = "ORG_ADMIN" | "INNOVATION_SPECIALIST" | "INTERNAL_INNOVATOR" | "SUPER_ADMIN";

const ALL_AREAS: PermissionArea[] = [
  "AUTH", "ORG", "USER", "IDEA", "CHALLENGE", "OPPORTUNITY", "EVALUATION",
  "GOVERNANCE", "PROJECT", "TASK", "TEAM", "RISK", "KPI", "IMPACT",
  "NOTIFICATION", "REPORT", "AUDIT",
];
const ALL_ACTIONS: PermissionAction[] = [
  "VIEW", "CREATE", "EDIT", "DELETE", "ARCHIVE", "EVALUATE", "ASSIGN", "APPROVE", "EXPORT", "MANAGE",
];
const ALL_GRANTS: ActorMembership["grants"] = ALL_AREAS.flatMap((area) =>
  ALL_ACTIONS.map((action) => ({ area, action }))
);

const ROLE_USER: Record<MockRole, { id: string; email: string; name: string }> = {
  ORG_ADMIN: { id: currentUser.id, email: currentUser.email, name: currentUser.fullName },
  INNOVATION_SPECIALIST: { id: "user-002", email: "faisal.alotaibi@hrsd.gov.sa", name: "فيصل ماجد العتيبي" },
  INTERNAL_INNOVATOR: { id: "user-004", email: "khalid.almutairi@hrsd.gov.sa", name: "خالد سعد المطيري" },
  SUPER_ADMIN: { id: "platform-admin-1", email: "admin@manarah.platform", name: "مسؤول المنصة" },
};

/** Null means no one has signed in yet via the quick-preview buttons on /login — the anonymous state. */
export async function getMockRoleOrNull(): Promise<MockRole | null> {
  const store = await cookies();
  const value = store.get(MOCK_ROLE_COOKIE)?.value;
  if (value === "ORG_ADMIN" || value === "INNOVATION_SPECIALIST" || value === "INTERNAL_INNOVATOR" || value === "SUPER_ADMIN") {
    return value;
  }
  return null;
}

/** Same as above but defaults to ORG_ADMIN — for mock data helpers that aren't part of the auth gate. */
export async function getMockRole(): Promise<MockRole> {
  return (await getMockRoleOrNull()) ?? "ORG_ADMIN";
}

export async function setMockRole(role: MockRole): Promise<void> {
  const store = await cookies();
  store.set(MOCK_ROLE_COOKIE, role, { path: "/", httpOnly: false, sameSite: "lax" });
}

export async function clearMockRole(): Promise<void> {
  const store = await cookies();
  store.delete(MOCK_ROLE_COOKIE);
}

export function buildMockActor(role: MockRole): Actor {
  const identity = ROLE_USER[role];
  const membership: ActorMembership = {
    membershipId: `mock-mem-${role}`,
    organizationId: ORG_ID,
    role: role === "SUPER_ADMIN" ? "ORG_ADMIN" : role,
    grants: ALL_GRANTS,
  };
  return {
    userId: identity.id,
    email: identity.email,
    memberships: role === "SUPER_ADMIN" ? [] : [membership],
    isPlatformAdmin: role === "SUPER_ADMIN",
  };
}

export function mockIdentityFor(role: MockRole) {
  return ROLE_USER[role];
}

export const mockUsers = users;
