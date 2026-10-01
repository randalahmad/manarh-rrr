/**
 * Innovation Opportunities — list/create/archive for the Org Admin
 * Opportunities page (`app/org/opportunities/page.tsx`). Exact structural
 * mirror of lib/server/services/challenges.ts (see that file's header for
 * rationale) — kept as its own domain, matching this codebase's convention
 * of not sharing logic between similar-but-distinct domains (ideas.ts vs
 * projects.ts, challenges vs opportunities in every other layer already).
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requirePermission, requireOrgMembership } from "@/lib/server/auth/guards";
import { NotFoundError, ConflictError } from "@/lib/server/errors";
import { auditLogStatement } from "@/lib/server/audit";
import type { Actor } from "@/lib/server/rbac/permissions";

export interface OpportunityRow {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  status: "DRAFT" | "OPEN" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  strategic_goal_id: string | null;
  priority: number | null;
  linked_ideas_count: number;
  usage_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export async function listOpportunitiesForOrganization(actor: Actor, organizationId: string): Promise<OpportunityRow[]> {
  requirePermission(actor, organizationId, "OPPORTUNITY", "VIEW");
  return query<OpportunityRow>(
    `SELECT * FROM innovation_opportunities WHERE organization_id = $1 ORDER BY priority NULLS LAST, created_at DESC`,
    [organizationId]
  );
}

export interface CreateOpportunityInput {
  organizationId: string;
  title: string;
  description: string;
  strategicGoalId?: string;
  priority?: number;
}

export async function createOpportunity(actor: Actor, input: CreateOpportunityInput): Promise<OpportunityRow> {
  requirePermission(actor, input.organizationId, "OPPORTUNITY", "CREATE");

  const [rows] = await transaction<[OpportunityRow[], unknown[]]>([
    {
      sql: `
        INSERT INTO innovation_opportunities (organization_id, title, description, status, strategic_goal_id, priority, created_by)
        VALUES ($1,$2,$3,'OPEN',$4,$5,$6)
        RETURNING *
      `,
      params: [
        input.organizationId,
        input.title,
        input.description,
        input.strategicGoalId ?? null,
        input.priority ?? null,
        actor.userId,
      ],
    },
    auditLogStatement({
      organizationId: input.organizationId,
      actor,
      action: "Opportunity Created",
      actionAr: "إنشاء فرصة ابتكارية",
      entityType: "OPPORTUNITY",
      entityId: input.title,
      permissionSnapshot: "OPPORTUNITY:CREATE",
    }),
  ]);

  const opportunity = rows[0];
  if (!opportunity) throw new ConflictError("Opportunity creation did not apply.");
  return opportunity;
}

export async function archiveOpportunity(actor: Actor, opportunityId: string): Promise<OpportunityRow> {
  const existing = await queryOne<OpportunityRow>(`SELECT * FROM innovation_opportunities WHERE id = $1`, [opportunityId]);
  if (!existing) throw new NotFoundError("Opportunity", opportunityId);
  requireOrgMembership(actor, existing.organization_id);
  requirePermission(actor, existing.organization_id, "OPPORTUNITY", "EDIT");

  const [rows] = await transaction<[OpportunityRow[], unknown[]]>([
    {
      sql: `UPDATE innovation_opportunities SET status = 'ARCHIVED', updated_at = now() WHERE id = $1 RETURNING *`,
      params: [opportunityId],
    },
    auditLogStatement({
      organizationId: existing.organization_id,
      actor,
      action: "Opportunity Archived",
      actionAr: "أرشفة فرصة ابتكارية",
      entityType: "OPPORTUNITY",
      entityId: opportunityId,
      permissionSnapshot: "OPPORTUNITY:EDIT",
    }),
  ]);

  const updated = rows[0];
  if (!updated) throw new ConflictError("Opportunity archive did not apply.");
  return updated;
}
