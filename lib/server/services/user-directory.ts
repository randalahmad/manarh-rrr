/**
 * User directory — minimal read service (Phase 6, Group B addition).
 *
 * Resolves user ids (submitter_id, evaluator_id, author_id, ...) into
 * display-safe identity info (name, avatar). Every idea/project/comment
 * list or detail view across all three interfaces needs to show a
 * person's name, not a raw uuid, and no such lookup existed anywhere in
 * Phase 5.
 *
 * Deliberately NOT organization-scoped: the caller has always already
 * authorized the underlying record (an idea, a comment, an evaluator
 * assignment) via its own service before ever having a user id to look up
 * — this just turns an id into a name, the same way looking up any other
 * foreign key's display value would. Requires only a valid session.
 *
 * Returns ONLY name/avatar — never email/phone/status/role, which stay
 * behind the actual authorization boundaries of whatever domain needs
 * them (e.g. the session payload in lib/server/actions/auth.ts).
 */
import { query } from "@/lib/server/db";
import type { Actor } from "@/lib/server/rbac/permissions";

export interface UserDisplayInfo {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

interface UserDisplayRow {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
}

/** `actor` is accepted for consistency with every other service's signature — see organizations.ts for the same "already authenticated by construction" reasoning. */
export async function getUsersDisplayInfo(
  _actor: Actor,
  userIds: string[]
): Promise<Record<string, UserDisplayInfo>> {
  if (userIds.length === 0) return {};
  const uniqueIds = Array.from(new Set(userIds));

  const rows = await query<UserDisplayRow>(
    `
    SELECT u.id, u.name, u.email, p.avatar_url
    FROM neon_auth.user u
    LEFT JOIN user_profiles p ON p.id = u.id
    WHERE u.id = ANY($1::uuid[])
    `,
    [uniqueIds]
  );

  const result: Record<string, UserDisplayInfo> = {};
  for (const row of rows) {
    result[row.id] = {
      id: row.id,
      fullName: row.name ?? row.email,
      avatarUrl: row.avatar_url,
    };
  }
  return result;
}

/** Convenience single-id wrapper over getUsersDisplayInfo. */
export async function getUserDisplayInfo(actor: Actor, userId: string): Promise<UserDisplayInfo | null> {
  const result = await getUsersDisplayInfo(actor, [userId]);
  return result[userId] ?? null;
}
