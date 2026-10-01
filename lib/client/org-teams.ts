/**
 * Client-side data layer for the Org Admin Teams page (`app/org/teams/page.tsx`).
 * Mirrors lib/client/org-notifications.ts's pattern.
 */
import type { ActionResult } from "@/lib/server/errors";
import { listTeamsAction } from "@/lib/server/actions/teams";
import { getUsersDisplayInfoAction } from "@/lib/server/actions/user-directory";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

export interface OrgTeamView {
  id: string;
  name: string;
  description: string | null;
  managerName: string | null;
  memberNames: string[];
}

export async function fetchOrgTeams(organizationId: string): Promise<OrgTeamView[]> {
  const teams = unwrap(await listTeamsAction({ organizationId }));

  const allUserIds = Array.from(
    new Set(teams.flatMap((t) => [...(t.manager_id ? [t.manager_id] : []), ...t.member_ids]))
  );
  const names = allUserIds.length
    ? unwrap(await getUsersDisplayInfoAction({ userIds: allUserIds }))
    : {};

  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    managerName: t.manager_id ? (names[t.manager_id]?.fullName ?? "—") : null,
    memberNames: t.member_ids.map((id) => names[id]?.fullName ?? "—"),
  }));
}
