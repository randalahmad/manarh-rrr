/**
 * Client-side data layer for the Org Admin dashboard (`app/org/dashboard/page.tsx`).
 * Orchestrates existing, unmodified real fetchers from the other org-*
 * client modules (ideas, projects, evaluations, information requests,
 * decisions/recommendations, audit logs) plus the one new additive
 * aggregate (`lib/server/actions/org-dashboard.ts`) — no other backend
 * changes. Stat computation reuses the existing pure selectors in
 * lib/selectors.ts (approvalRate, projectStats, ideaLifecycleCounts,
 * funnel) rather than re-deriving business logic here.
 */
import type { Idea, Project, EvaluatorAssignment, InformationRequest, AuditLog } from "@/lib/types";
import { fetchOrgIdeas } from "./org-ideas";
import { fetchOrgProjects } from "./org-projects";
import { fetchOrgAssignments } from "./org-evaluations";
import { fetchOrgInformationRequests } from "./org-information-requests";
import { fetchOrgAuditLogs } from "./org-audit-logs";
import { getOrgImpactMeasurementCountAction } from "@/lib/server/actions/org-dashboard";

export interface OrgDashboardData {
  ideas: Idea[];
  projects: Project[];
  assignments: EvaluatorAssignment[];
  informationRequests: InformationRequest[];
  impactMeasurementCount: number;
  recentActivity: AuditLog[];
}

export async function fetchOrgDashboard(organizationId: string): Promise<OrgDashboardData> {
  const [ideas, projects, assignments, infoData, impactCountResult, auditLogs] = await Promise.all([
    fetchOrgIdeas(organizationId),
    fetchOrgProjects(organizationId),
    fetchOrgAssignments(organizationId),
    fetchOrgInformationRequests(organizationId),
    getOrgImpactMeasurementCountAction({ organizationId }),
    fetchOrgAuditLogs(organizationId),
  ]);

  return {
    ideas,
    projects,
    assignments,
    informationRequests: infoData.requests,
    impactMeasurementCount: impactCountResult.ok ? impactCountResult.data : 0,
    recentActivity: auditLogs.slice(0, 5),
  };
}
