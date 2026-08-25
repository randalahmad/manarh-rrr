/**
 * Organizations directory — minimal read service (Phase 6, Group B
 * addition).
 *
 * Needed for the Innovator interface's organization picker on idea
 * submission — deliberately NOT organization-scoped like most services
 * here, since the whole point is letting a signed-in user (who may have no
 * membership in the organization they're targeting — e.g. an
 * EXTERNAL_INNOVATOR submitting to an org they've never worked with) see
 * the list of organizations that accept ideas. Requires only a valid
 * session (requireActor), not org membership.
 *
 * Returns display-safe fields only — no `contact_email`/`contact_phone`
 * (internal contact details, not needed for a picker and not vetted for
 * broad exposure).
 */
import { query } from "@/lib/server/db";
import type { Actor, ActorMembership } from "@/lib/server/rbac/permissions";

export interface OrganizationSummary {
  id: string;
  name: string;
  name_en: string | null;
  logo_url: string | null;
  sector: string;
}

/** `actor` is accepted (and required to be a valid session via the caller's guard) for consistency with every other service's signature, even though the query itself doesn't scope by it. */
export async function listActiveOrganizations(_actor: Actor): Promise<OrganizationSummary[]> {
  return query<OrganizationSummary>(
    `SELECT id, name, name_en, logo_url, sector FROM organizations WHERE status = 'ACTIVE' ORDER BY name ASC`
  );
}

export interface MyOrganizationSummary extends OrganizationSummary {
  role: ActorMembership["role"];
}

/**
 * The organizations the current actor actually has an ACTIVE membership
 * in — the correct dataset for "which org can I submit an idea to /
 * see ideas in", since every idea-scoped service requires org membership
 * regardless of role (see requireOrgMembership). Needs no query against
 * `organizations` beyond resolving names for ids already known from the
 * session — `actor.memberships` is already authoritative.
 */
export async function listMyOrganizations(actor: Actor): Promise<MyOrganizationSummary[]> {
  if (actor.memberships.length === 0) return [];
  const ids = actor.memberships.map((m) => m.organizationId);
  const rows = await query<OrganizationSummary>(
    `SELECT id, name, name_en, logo_url, sector FROM organizations WHERE id = ANY($1::uuid[]) ORDER BY name ASC`,
    [ids]
  );
  const roleByOrg = new Map(actor.memberships.map((m) => [m.organizationId, m.role]));
  return rows.map((row) => ({ ...row, role: roleByOrg.get(row.id)! }));
}

/** The actor's role in a specific organization, or null if they have no membership there. Pure lookup over the already-resolved session — no query needed. */
export function getMyRoleInOrganization(actor: Actor, organizationId: string): ActorMembership["role"] | null {
  return actor.memberships.find((m) => m.organizationId === organizationId)?.role ?? null;
}
