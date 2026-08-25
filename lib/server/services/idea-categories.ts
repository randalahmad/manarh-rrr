/**
 * Idea Categories — minimal read service (Phase 6, Group B addition).
 *
 * `idea_categories` is a real Phase 4 table with no Phase 5 service. It was
 * out of Phase 5's approved 17-domain scope, but idea creation genuinely
 * cannot be wired without it: `ideas.category_id` is `NOT NULL`. Per the
 * explicit user decision for Phase 6 Group B, this is a minimal read-only
 * service — no create/edit/archive here, since nothing in scope needs to
 * mutate categories, only pick from them.
 *
 * Authorization: no dedicated `CATEGORY` permission area exists in the
 * approved RBAC catalog (permission_area enum has no such value), and none
 * is invented here. Categories are treated as org-visible reference data —
 * any ACTIVE member of the organization can list them (needed both to
 * populate the idea-submission picker and to display a category's name on
 * an idea already scoped to that org).
 */
import { query } from "@/lib/server/db";
import { requireOrgMembership } from "@/lib/server/auth/guards";
import type { Actor } from "@/lib/server/rbac/permissions";

export interface IdeaCategoryRow {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  priority: number | null;
  related_ideas_count: number;
  usage_count: number;
  strategic_goal_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function listCategoriesForOrganization(
  actor: Actor,
  organizationId: string,
  opts: { activeOnly?: boolean } = {}
): Promise<IdeaCategoryRow[]> {
  requireOrgMembership(actor, organizationId);
  const activeOnly = opts.activeOnly ?? true;
  return query<IdeaCategoryRow>(
    activeOnly
      ? `SELECT * FROM idea_categories WHERE organization_id = $1 AND status = 'ACTIVE' ORDER BY name ASC`
      : `SELECT * FROM idea_categories WHERE organization_id = $1 ORDER BY name ASC`,
    [organizationId]
  );
}
