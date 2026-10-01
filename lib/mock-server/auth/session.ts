import type { Actor } from "@/lib/server/rbac/permissions";
import { buildMockActor, getMockRoleOrNull, mockIdentityFor } from "@/lib/mock-server/session";

export interface SessionIdentity {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
}

export async function getCurrentActor(): Promise<Actor | null> {
  const role = await getMockRoleOrNull();
  return role ? buildMockActor(role) : null;
}

export async function getCurrentUserProfile(_userId: string) {
  return { status: "ACTIVE" as const };
}

export async function getCurrentSessionIdentity(): Promise<SessionIdentity | null> {
  const role = await getMockRoleOrNull();
  if (!role) return null;
  const identity = mockIdentityFor(role);
  return { userId: identity.id, email: identity.email, name: identity.name, image: null };
}
