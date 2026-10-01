/**
 * Frontend-only prototype: converts the existing UI-shaped seed data
 * (lib/mock-data/seed.ts, camelCase, matching @/lib/types) into the
 * snake_case "Row" shapes the real Server Actions normally return from
 * Postgres. lib/client/*.ts mapper functions (mapIdeaRow etc.) then work
 * completely unchanged against this data.
 */
import {
  ORG_ID, organization, orgSettings, currentUser, users, teams, strategicGoals,
  categories, challenges, opportunities, ideas, ideaStatusHistory, evaluatorAssignments,
  evaluations, decisions, informationRequests, projects, projectMembers, projectTasks,
  projectRisks, kpis, impactMeasurements, innovationRecords, auditLogs, roles,
  daysAgo,
} from "@/lib/mock-data/seed";

export { ORG_ID, organization, currentUser, users };

export const ideaRows = ideas.map((idea) => ({
  id: idea.id,
  organization_id: ORG_ID,
  title: idea.title,
  description: idea.description,
  problem_statement: idea.problemStatement,
  proposed_solution: idea.proposedSolution,
  expected_impact: idea.expectedImpact,
  category_id: idea.categoryId,
  challenge_id: idea.challengeId ?? null,
  opportunity_id: idea.opportunityId ?? null,
  submitter_id: idea.submitterId,
  submitter_type: idea.submitterType,
  status: idea.status,
  project_id: idea.projectId ?? null,
  withdrawal_reason: idea.withdrawalReason ?? null,
  submitted_at: idea.submittedAt ?? null,
  created_at: idea.submittedAt ?? idea.updatedAt,
  updated_at: idea.updatedAt,
}));

export const ideaStatusHistoryRows = ideaStatusHistory.map((h) => ({
  id: h.id,
  idea_id: h.ideaId,
  from_status: h.fromStatus ?? null,
  to_status: h.toStatus,
  changed_by: h.changedBy,
  note: h.note ?? null,
  changed_at: h.changedAt,
}));

export const categoryRows = categories.map((c) => ({
  id: c.id,
  organization_id: ORG_ID,
  name: c.name,
  description: c.description,
  status: c.status,
  priority: c.priority ?? null,
  related_ideas_count: c.relatedIdeasCount ?? 0,
  usage_count: c.usageCount ?? 0,
  strategic_goal_id: c.strategicGoalId ?? null,
  created_at: c.createdAt,
  updated_at: c.createdAt,
}));

export const challengeRows = challenges.map((c) => ({
  id: c.id,
  organization_id: ORG_ID,
  title: c.title,
  description: c.description,
  status: c.status,
  strategic_goal_id: c.strategicGoalId ?? null,
  priority: c.priority ?? null,
  linked_ideas_count: c.linkedIdeasCount ?? 0,
  usage_count: c.usageCount ?? 0,
  created_by: c.createdBy,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
}));

export const opportunityRows = opportunities.map((o) => ({
  id: o.id,
  organization_id: ORG_ID,
  title: o.title,
  description: o.description,
  status: o.status,
  strategic_goal_id: o.strategicGoalId ?? null,
  priority: o.priority ?? null,
  linked_ideas_count: o.linkedIdeasCount ?? 0,
  usage_count: o.usageCount ?? 0,
  created_by: o.createdBy,
  created_at: o.createdAt,
  updated_at: o.updatedAt,
}));

export const strategicGoalRows = strategicGoals.map((g) => ({
  id: g.id,
  organization_id: ORG_ID,
  name: g.name,
  description: g.description,
  status: g.status,
  target_value: g.targetValue ?? null,
  current_value: g.currentValue ?? null,
  unit: g.unit ?? null,
  measurement_period_start: g.measurementPeriodStart ?? null,
  measurement_period_end: g.measurementPeriodEnd ?? null,
  owner_id: g.ownerId ?? null,
  progress_percentage: g.progressPercentage ?? null,
  linked_ideas_count: g.linkedIdeasCount ?? 0,
  linked_projects_count: g.linkedProjectsCount ?? 0,
  created_at: g.createdAt,
  updated_at: g.createdAt,
}));

export const evaluatorAssignmentRows = evaluatorAssignments.map((a) => ({
  id: a.id,
  idea_id: a.ideaId,
  evaluator_id: a.evaluatorId,
  assigned_by: a.assignedBy,
  status: a.status,
  due_at: a.dueAt ?? null,
  assigned_at: a.assignedAt,
  updated_at: a.assignedAt,
}));

export const evaluationRows = evaluations.map((e) => ({
  id: e.id,
  idea_id: e.ideaId,
  evaluator_id: e.evaluatorId,
  strategic_alignment_score: e.strategicAlignmentScore,
  feasibility_score: e.feasibilityScore,
  resource_readiness_score: e.resourceReadinessScore,
  notes: e.notes ?? "",
  submitted_at: e.submittedAt,
}));

export const recommendationRows = [
  { id: "rec-105", idea_id: "idea-105", evaluation_id: "eval-101", recommendation_type: "APPROVE" as const, summary: "تقييم إيجابي، يوصى بالاعتماد ونقل الفكرة لمرحلة القرار.", submitted_by: "user-003", submitted_at: daysAgo(3) },
];

export const decisionRows = decisions.map((d) => ({
  id: d.id,
  idea_id: d.ideaId ?? null,
  project_id: d.projectId ?? null,
  recommendation_id: d.recommendationId ?? null,
  decision_type: d.decisionType,
  reason: d.reason,
  conditions: null as string | null,
  notes: d.notes ?? null,
  decided_by: d.decidedBy,
  decided_at: d.decidedAt,
}));

export const informationRequestRows = informationRequests.map((r) => ({
  id: r.id,
  idea_id: r.ideaId,
  requested_by: r.requestedBy,
  request_text: r.requestText,
  status: r.status,
  response_text: r.responseText ?? null,
  responded_by: r.respondedBy ?? null,
  requested_at: r.requestedAt,
  responded_at: r.respondedAt ?? null,
}));

export const commentRows = [
  { id: "cm-1", entity_type: "IDEA" as const, entity_id: "idea-101", author_id: "user-002", content: "يرجى إضافة تفاصيل تقنية أكثر حول التكامل مع البوابة الحالية.", created_at: daysAgo(5), updated_at: null as string | null },
  { id: "cm-2", entity_type: "IDEA" as const, entity_id: "idea-101", author_id: "user-005", content: "تم تحديث الوصف بالتفاصيل المطلوبة.", created_at: daysAgo(4), updated_at: null as string | null },
];

export const attachmentRows = ideas
  .filter((i) => i.attachments.length > 0)
  .flatMap((i) =>
    i.attachments.map((a) => ({
      id: a.id,
      entity_type: "IDEA" as const,
      entity_id: i.id,
      file_name: a.fileName,
      file_type: a.fileType,
      size_kb: a.sizeKb,
      storage_provider: "mock",
      storage_bucket: "mock",
      storage_key: a.id,
      uploaded_by: a.uploadedBy,
      uploaded_at: a.uploadedAt,
    }))
  );

export const projectRows = projects.map((p) => ({
  id: p.id,
  organization_id: ORG_ID,
  idea_id: p.ideaId,
  challenge_id: p.challengeId ?? null,
  opportunity_id: p.opportunityId ?? null,
  name: p.name,
  description: p.description,
  owner_id: p.ownerId,
  status: p.status,
  previous_active_status: null,
  progress: p.progress,
  budget: p.budget ?? null,
  baseline: p.baseline ?? null,
  actual_cost: p.actualCost ?? null,
  start_date: p.startDate ?? null,
  expected_completion_date: p.expectedCompletionDate ?? null,
  actual_completion_date: p.actualCompletionDate ?? null,
  created_at: p.createdAt,
  updated_at: p.updatedAt,
}));

export const projectMemberRows = projectMembers.map((m) => ({
  id: m.id,
  project_id: m.projectId,
  user_id: m.userId,
  role_in_project: m.roleInProject,
  added_at: m.addedAt,
}));

export const projectTaskRows = projectTasks.map((t) => ({
  id: t.id,
  project_id: t.projectId,
  title: t.title,
  description: t.description ?? null,
  assignee_id: t.assigneeId ?? null,
  status: t.status,
  priority: t.priority,
  due_date: t.dueDate ?? null,
  created_at: t.createdAt,
  updated_at: t.updatedAt,
}));

export const projectRiskRows = projectRisks.map((r) => ({
  id: r.id,
  project_id: r.projectId,
  title: r.title,
  description: r.description,
  level: r.level,
  status: r.status,
  owner_id: r.ownerId ?? null,
  mitigation_plan: r.mitigationPlan ?? null,
  blocker: r.blocker ?? false,
  created_at: r.createdAt,
  updated_at: r.updatedAt,
}));

export const projectRequirementRows = projects.map((p, i) => ({
  id: `req-${p.id}`,
  project_id: p.id,
  title: "استكمال متطلبات البنية التحتية",
  description: "التأكد من جاهزية البيئة التقنية قبل الإطلاق.",
  status: (i === 0 ? "DONE" : "IN_PROGRESS") as "PENDING" | "IN_PROGRESS" | "DONE",
  due_date: p.expectedCompletionDate ?? null,
  created_at: p.createdAt,
  updated_at: p.updatedAt,
}));

export const projectMilestoneRows = projects.map((p) => ({
  id: `ms-${p.id}`,
  project_id: p.id,
  title: "إطلاق النسخة التجريبية",
  description: "إطلاق أولي محدود للتحقق من الأداء.",
  due_date: p.expectedCompletionDate ?? daysAgo(-30),
  status: (p.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS") as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DELAYED",
  created_at: p.createdAt,
  updated_at: p.updatedAt,
}));

export const projectUpdateRows = projects.map((p) => ({
  id: `upd-${p.id}`,
  project_id: p.id,
  author_id: p.ownerId,
  update_type: "NOTE" as const,
  content: "تم إحراز تقدم جيد هذا الأسبوع وفق الخطة الموضوعة.",
  created_at: p.updatedAt,
}));

export const kpiRows = kpis.map((k) => ({
  id: k.id,
  project_id: k.projectId ?? null,
  idea_id: k.ideaId ?? null,
  strategic_goal_id: k.strategicGoalId ?? null,
  name: k.name,
  unit: k.unit,
  target_value: k.targetValue,
  current_value: k.currentValue,
  owner_id: k.ownerId ?? null,
  created_at: k.createdAt,
  updated_at: k.updatedAt,
}));

export const impactMeasurementRows = impactMeasurements.map((m) => ({
  id: m.id,
  project_id: m.projectId ?? null,
  idea_id: m.ideaId ?? null,
  type: m.type,
  description: m.description,
  baseline_value: m.baselineValue ?? null,
  target_value: m.targetValue ?? null,
  actual_value: m.actualValue ?? null,
  unit: m.unit ?? null,
  measured_by: m.measuredBy,
  measured_at: m.measuredAt,
}));

export const innovationRecordRows = innovationRecords.map((r) => ({
  id: r.id,
  organization_id: ORG_ID,
  idea_id: r.ideaId,
  project_id: r.projectId ?? null,
  final_status: r.finalStatus,
  outcome: r.outcome ?? null,
  closed_at: r.closedAt ?? null,
  archived_at: null as string | null,
  created_at: r.closedAt ?? daysAgo(1),
  impact_measurement_ids: r.impactMeasurementIds ?? [],
}));

export const auditLogRows = auditLogs.map((l) => ({
  id: l.id,
  organization_id: ORG_ID,
  user_id: l.userId,
  user_name: l.userName,
  action: l.action,
  action_ar: l.actionAr,
  entity_type: l.entityType,
  entity_id: l.entityId,
  previous_state: l.previousState ?? null,
  new_state: l.newState ?? null,
  permission_snapshot: l.permissionSnapshot ?? null,
  sensitive_view: l.sensitiveView ?? false,
  decision_details: null as string | null,
  ip_address: l.ipAddress,
  device: l.device ?? "Chrome · Windows",
  readonly: l.readonly ?? true,
  timestamp: l.timestamp,
}));

export const notificationRows = [
  { id: "ntf-1", organization_id: ORG_ID, recipient_id: currentUser.id, title: "فكرة جديدة بانتظار الفرز", message: "تم تقديم فكرة جديدة تحتاج إلى فرز أولي.", entity_type: "IDEA" as const, entity_id: ideas[0]?.id ?? "idea-101", is_read: false, created_at: daysAgo(0) },
  { id: "ntf-2", organization_id: ORG_ID, recipient_id: currentUser.id, title: "تم اتخاذ قرار بشأن فكرة", message: "تم اعتماد فكرة وتحويلها إلى مشروع.", entity_type: "IDEA" as const, entity_id: ideas[2]?.id ?? "idea-103", is_read: true, created_at: daysAgo(2) },
  { id: "ntf-3", organization_id: ORG_ID, recipient_id: currentUser.id, title: "تحديث على مشروع", message: "تمت إضافة تحديث جديد على أحد المشاريع.", entity_type: "PROJECT" as const, entity_id: projects[0]?.id ?? "proj-1", is_read: false, created_at: daysAgo(1) },
];

export const orgMemberRows = users.map((u) => ({
  membership_id: `mem-${u.id}`,
  user_id: u.id,
  organization_id: ORG_ID,
  email: u.email,
  full_name: u.fullName,
  avatar_url: null as string | null,
  phone: u.phone ?? null,
  role: u.role,
  membership_status: (u.status === "DISABLED" ? "INACTIVE" : "ACTIVE") as "ACTIVE" | "INACTIVE",
  department: u.department ?? null,
  account_status: u.status,
  ideas_submitted: u.ideasSubmitted ?? 0,
  ideas_approved: u.ideasApproved ?? 0,
  projects_involved: u.projectsInvolved ?? 0,
  last_activity_at: u.lastActivityAt ?? null,
  created_at: u.createdAt,
}));

export const roleWithPermissionsRows = roles.map((r) => ({
  id: r.id,
  name: r.name,
  name_ar: r.nameAr,
  description: r.description,
  is_system: r.isSystem,
  system_role_key: r.id === "role-admin" ? "ORG_ADMIN" : r.id === "role-specialist" ? "INNOVATION_SPECIALIST" : null,
  user_count: r.userCount,
  permissions: r.permissions.map((p) => ({ id: p.id, area: p.area, action: p.action, scope_type: "ORGANIZATION" as const, note: p.note ?? null })),
}));

export const teamWithMemberRows = teams.map((t) => ({
  id: t.id,
  organization_id: ORG_ID,
  name: t.name,
  description: t.description ?? null,
  manager_id: t.managerId ?? null,
  created_at: t.createdAt,
  updated_at: t.updatedAt,
  member_ids: t.memberIds,
}));

export const organizationSettingsBundle = {
  organization: {
    id: ORG_ID,
    name: organization.name,
    name_en: organization.nameEn ?? null,
    description: organization.description,
    logo_url: null as string | null,
    status: organization.status,
    contact_email: organization.contactEmail,
    contact_phone: organization.contactPhone,
    sector: organization.sector,
  },
  settings: {
    organization_id: ORG_ID,
    require_evaluation_before_decision: orgSettings.workflow.requireEvaluationBeforeDecision,
    allow_idea_withdrawal_after_approval: orgSettings.workflow.allowIdeaWithdrawalAfterApproval,
    auto_notify_stakeholders_on_decision: orgSettings.workflow.autoNotifyStakeholdersOnDecision,
    default_decision_sla_days: orgSettings.workflow.defaultDecisionSlaDays,
    minimum_evaluators: orgSettings.evaluation.minimumEvaluators ?? null,
    allow_self_evaluation: orgSettings.evaluation.allowSelfEvaluation ?? false,
    notify_on_new_idea: orgSettings.notificationPreferences.notifyOnNewIdea,
    notify_on_decision: orgSettings.notificationPreferences.notifyOnDecision,
    notify_on_project_update: orgSettings.notificationPreferences.notifyOnProjectUpdate,
    daily_digest: orgSettings.notificationPreferences.dailyDigest,
    escalation_enabled: orgSettings.notificationPreferences.escalationEnabled,
  },
  workflowStages: orgSettings.workflow.stages.map((s) => ({
    id: s.id, organization_id: ORG_ID, name: s.name, name_ar: s.nameAr, stage_order: s.order, enabled: s.enabled,
    duration_days: s.durationDays, is_system_stage: s.isSystemStage ?? false, protected: s.protected ?? false,
  })),
  evaluationCriteria: orgSettings.evaluation.criteria.map((c) => ({
    id: c.id, organization_id: ORG_ID, name: c.name, name_ar: c.nameAr, description: c.description ?? null,
    max_score: c.maxScore, weight: c.weight ?? null, is_active: c.isActive,
  })),
  notificationTemplates: (orgSettings.notificationTemplates ?? []).map((t) => ({
    id: t.id, organization_id: ORG_ID, event: t.event, event_ar: t.eventAr,
    channel: t.channel, subject: t.subject, body: t.body, is_active: t.isActive,
  })),
  escalationRules: orgSettings.escalationRules.map((r) => ({
    id: r.id, stage_id: r.stageId, after_days: r.afterDays, notify_role: r.notifyRole, is_active: r.isActive,
  })),
};

export const organizationSummaryRow = {
  id: ORG_ID,
  name: organization.name,
  name_en: organization.nameEn ?? null,
  logo_url: null as string | null,
  sector: organization.sector,
};

// --- Super Admin domain (no legacy seed; small, hand-written) ---
export const platformOrganizationRows = [
  { id: ORG_ID, name: organization.name, name_en: organization.nameEn ?? null, logo_url: null as string | null, status: "ACTIVE" as const, sector: organization.sector, contact_email: organization.contactEmail, contact_phone: organization.contactPhone, created_at: organization.createdAt, description: organization.description, updated_at: organization.updatedAt, member_count: users.length, admin_count: 1 },
  { id: "org-002", name: "الهيئة العامة للإحصاء", name_en: "General Authority for Statistics", logo_url: null as string | null, status: "ACTIVE" as const, sector: "القطاع الحكومي", contact_email: "innovation@stats.gov.sa", contact_phone: "+966 11 900 1111", created_at: daysAgo(200), description: "جهة حكومية منضمة إلى منصة منارة.", updated_at: daysAgo(10), member_count: 12, admin_count: 1 },
  { id: "org-003", name: "شركة المياه الوطنية", name_en: "National Water Company", logo_url: null as string | null, status: "SUSPENDED" as const, sector: "القطاع شبه الحكومي", contact_email: "innovation@nwc.com.sa", contact_phone: "+966 11 900 2222", created_at: daysAgo(150), description: "جهة موقوفة مؤقتًا لمراجعة الاشتراك.", updated_at: daysAgo(30), member_count: 6, admin_count: 1 },
];

export const platformAuditLogRows = [
  { id: "paudit-1", organization_id: ORG_ID, user_id: "platform-admin-1", user_name: "مسؤول المنصة", action: "Organization Suspended", action_ar: "إيقاف جهة", entity_type: "Organization", entity_id: "org-003", previous_state: "ACTIVE", new_state: "SUSPENDED", permission_snapshot: "PLATFORM:MANAGE", timestamp: daysAgo(30) },
  { id: "paudit-2", organization_id: "org-002", user_id: "platform-admin-1", user_name: "مسؤول المنصة", action: "Organization Created", action_ar: "إنشاء جهة جديدة", entity_type: "Organization", entity_id: "org-002", previous_state: null, new_state: "ACTIVE", permission_snapshot: "PLATFORM:MANAGE", timestamp: daysAgo(200) },
];

export const platformStats = {
  organizationCount: platformOrganizationRows.length,
  activeOrganizationCount: platformOrganizationRows.filter((o) => o.status === "ACTIVE").length,
  suspendedOrganizationCount: platformOrganizationRows.filter((o) => o.status === "SUSPENDED").length,
  platformAdminCount: 1,
};
