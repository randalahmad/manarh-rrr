/**
 * Shared zod schemas for mutation inputs. Every Server Action validates
 * its `FormData`/object input against one of these BEFORE calling into
 * the service layer — per Next's own security guidance, schema validation
 * only checks shape, so services additionally re-derive ownership/org
 * scope from the session rather than trusting client-supplied ids for
 * anything except "which row to look up."
 */
import { z } from "zod";

export const uuid = z.string().uuid();

export const ideaStatusEnum = z.enum([
  "DRAFT", "SUBMITTED", "INITIAL_SCREENING", "UNDER_REVIEW", "NEEDS_INFORMATION",
  "UNDER_EVALUATION", "RECOMMENDATION_SUBMITTED", "PENDING_DECISION",
  "APPROVED", "CONDITIONALLY_APPROVED", "IDEA_DEVELOPMENT", "CONVERTED_TO_PROJECT",
  "DEFERRED", "RETURNED_FOR_REVIEW", "NOT_PURSUED", "REJECTED", "WITHDRAWN", "ARCHIVED",
]);

export const projectStatusEnum = z.enum([
  "PROJECT_CREATED", "DEVELOPMENT", "PLANNING", "ASSIGN_STAKEHOLDERS", "DEFINE_REQUIREMENTS",
  "DEFINE_TIMELINE", "EXECUTION", "TESTING", "LAUNCH", "IN_PROGRESS", "BLOCKED",
  "ON_HOLD", "COMPLETED", "CLOSED", "ARCHIVED",
]);

export const recommendationTypeEnum = z.enum([
  "APPROVE", "CONDITIONALLY_APPROVE", "CONVERT_TO_PROJECT", "DEFER", "REJECT", "REQUEST_INFORMATION",
]);

export const createIdeaSchema = z.object({
  organizationId: uuid,
  title: z.string().trim().min(3).max(300),
  description: z.string().trim().min(1),
  problemStatement: z.string().trim().min(1),
  proposedSolution: z.string().trim().min(1),
  expectedImpact: z.string().trim().min(1),
  categoryId: uuid,
  challengeId: uuid.optional(),
  opportunityId: uuid.optional(),
  submitterType: z.enum(["INTERNAL", "EXTERNAL"]),
});

export const transitionIdeaSchema = z.object({
  ideaId: uuid,
  toStatus: ideaStatusEnum,
  note: z.string().trim().max(2000).optional(),
});

export const withdrawIdeaSchema = z.object({
  ideaId: uuid,
  reason: z.string().trim().max(2000).optional(),
});

export const getIdeaSchema = z.object({
  ideaId: uuid,
});

export const listIdeasSchema = z.object({
  organizationId: uuid,
  status: ideaStatusEnum.optional(),
  submitterId: uuid.optional(),
});

export const updateIdeaSchema = z.object({
  ideaId: uuid,
  title: z.string().trim().min(3).max(300).optional(),
  description: z.string().trim().min(1).optional(),
  problemStatement: z.string().trim().min(1).optional(),
  proposedSolution: z.string().trim().min(1).optional(),
  expectedImpact: z.string().trim().min(1).optional(),
  categoryId: uuid.optional(),
  challengeId: uuid.nullable().optional(),
  opportunityId: uuid.nullable().optional(),
});

export const listIdeaCategoriesSchema = z.object({
  organizationId: uuid,
  activeOnly: z.boolean().optional(),
});

/**
 * Super Admin / platform-admin schemas (Phase 6 — Super Admin minimal
 * implementation). Deliberately separate from the org-scoped schemas above
 * — every action here is gated by requirePlatformAdmin(), never by
 * requireOrgMembership/requirePermission, and none of these accept a
 * "role"/"scope" field the way an org-scoped mutation might, since platform
 * scope is not part of the (area, action) permission catalog at all (see
 * lib/server/rbac/permissions.ts's Actor.isPlatformAdmin doc comment).
 */
export const platformOrganizationIdSchema = z.object({
  organizationId: uuid,
});

export const createPlatformOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(300),
  nameEn: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().min(1),
  logoUrl: z.string().trim().url().optional(),
  contactEmail: z.string().trim().toLowerCase().email(),
  contactPhone: z.string().trim().min(1).max(50),
  sector: z.string().trim().min(1).max(200),
});

export const bootstrapOrgAdminSchema = z.object({
  organizationId: uuid,
  email: z.string().trim().toLowerCase().email(),
  fullName: z.string().trim().min(1).max(200),
});

export const listPlatformAuditLogsSchema = z.object({
  limit: z.number().int().min(1).max(500).optional(),
});

export const listOrganizationsSchema = z.object({}).optional();

export const getUsersDisplayInfoSchema = z.object({
  userIds: z.array(uuid).min(1).max(200),
});

export const createInformationRequestSchema = z.object({
  ideaId: uuid,
  requestText: z.string().trim().min(1).max(5000),
});

export const respondToInformationRequestSchema = z.object({
  requestId: uuid,
  responseText: z.string().trim().min(1).max(5000),
});

export const listInformationRequestsSchema = z.object({
  ideaId: uuid,
});

/** Final QA audit fix (Critical Issue 3) — org-wide read, {organizationId} shape matching listIdeasSchema/listStrategicGoalsSchema. */
export const listInformationRequestsForOrganizationSchema = z.object({
  organizationId: uuid,
});

/**
 * Phase 6, Group C addition — shared shape for every org-wide read action
 * added this phase (evaluator assignments, evaluations, recommendations,
 * decisions), matching the {organizationId} shape `listIdeasSchema` already
 * uses for the same purpose.
 */
export const organizationScopeSchema = z.object({
  organizationId: uuid,
});

export const assignEvaluatorSchema = z.object({
  ideaId: uuid,
  evaluatorUserId: uuid,
  dueAt: z.string().datetime().optional(),
});

export const submitEvaluationSchema = z.object({
  ideaId: uuid,
  strategicAlignmentScore: z.number().min(0).max(10),
  feasibilityScore: z.number().min(0).max(10),
  resourceReadinessScore: z.number().min(0).max(10),
  notes: z.string().trim().min(1),
});

export const submitRecommendationSchema = z.object({
  ideaId: uuid,
  evaluationId: uuid.optional(),
  recommendationType: recommendationTypeEnum,
  summary: z.string().trim().min(1),
});

export const makeDecisionSchema = z
  .object({
    ideaId: uuid.optional(),
    projectId: uuid.optional(),
    recommendationId: uuid.optional(),
    decisionType: recommendationTypeEnum,
    reason: z.string().trim().min(1),
    conditions: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .refine((v) => v.ideaId || v.projectId, {
    message: "A decision must reference an idea or a project.",
  });

export const createProjectSchema = z.object({
  organizationId: uuid,
  ideaId: uuid,
  name: z.string().trim().min(3).max(300),
  description: z.string().trim().min(1),
  ownerId: uuid,
  startDate: z.string().datetime(),
  expectedCompletionDate: z.string().datetime(),
  budget: z.number().nonnegative().optional(),
});

export const transitionProjectSchema = z.object({
  projectId: uuid,
  toStatus: projectStatusEnum,
});

/** Phase 6, Group D addition — Phase 5 built getProjectById/listProjectsForOrganization as services only; no UI consumed them yet (mirrors getIdeaSchema/listIdeasSchema). */
export const getProjectSchema = z.object({
  projectId: uuid,
});

export const listProjectsSchema = z.object({
  organizationId: uuid,
  status: projectStatusEnum.optional(),
  ownerId: uuid.optional(),
});

export const addCommentSchema = z.object({
  entityType: z.enum(["IDEA", "PROJECT", "CHALLENGE", "OPPORTUNITY", "TASK"]),
  entityId: uuid,
  content: z.string().trim().min(1).max(10_000),
});

/** Phase 6, Group B addition — Phase 5 built listCommentsForEntity as a service only; no UI consumed it yet. */
export const listCommentsSchema = z.object({
  entityType: z.enum(["IDEA", "PROJECT", "CHALLENGE", "OPPORTUNITY", "TASK"]),
  entityId: uuid,
});

export const createAttachmentSchema = z.object({
  entityType: z.enum(["IDEA", "PROJECT", "EVALUATION", "PROJECT_DOCUMENT", "INFORMATION_REQUEST", "COMMENT"]),
  entityId: uuid,
  fileName: z.string().trim().min(1).max(500),
  fileType: z.string().trim().min(1).max(200),
  sizeKb: z.number().int().positive(),
  storageBucket: z.string().trim().min(1),
  storageKey: z.string().trim().min(1),
  storageProvider: z.string().trim().min(1).default("s3"),
});

export const createTaskSchema = z.object({
  projectId: uuid,
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().optional(),
  assigneeId: uuid.optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskStatusSchema = z.object({
  taskId: uuid,
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]),
});

export const createMilestoneSchema = z.object({
  projectId: uuid,
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().optional(),
  dueDate: z.string().datetime(),
});

export const createRiskSchema = z.object({
  projectId: uuid,
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1),
  level: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  ownerId: uuid.optional(),
  mitigationPlan: z.string().trim().optional(),
  blocker: z.boolean().default(false),
});

export const createRequirementSchema = z.object({
  projectId: uuid,
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1),
  dueDate: z.string().datetime().optional(),
});

export const addProjectMemberSchema = z.object({
  projectId: uuid,
  userId: uuid,
  roleInProject: z.string().trim().min(1).max(200),
});

export const addProjectUpdateSchema = z.object({
  projectId: uuid,
  updateType: z.enum(["STATUS_CHANGE", "NOTE", "MILESTONE", "TIMELINE_CHANGE"]),
  content: z.string().trim().min(1),
});

export const createStrategicGoalSchema = z.object({
  organizationId: uuid,
  name: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1),
  targetValue: z.number().optional(),
  unit: z.string().trim().optional(),
  ownerId: uuid.optional(),
});

export const createKpiSchema = z
  .object({
    projectId: uuid.optional(),
    ideaId: uuid.optional(),
    strategicGoalId: uuid.optional(),
    name: z.string().trim().min(1).max(300),
    unit: z.string().trim().min(1),
    targetValue: z.number(),
    currentValue: z.number().default(0),
    ownerId: uuid.optional(),
  })
  .refine((v) => v.projectId || v.ideaId || v.strategicGoalId, {
    message: "A KPI must reference a project, idea, or strategic goal.",
  });

export const createImpactMeasurementSchema = z
  .object({
    projectId: uuid.optional(),
    ideaId: uuid.optional(),
    type: z.enum(["FINANCIAL", "OPERATIONAL", "CUSTOMER", "STRATEGIC", "OTHER"]),
    description: z.string().trim().min(1),
    baselineValue: z.number().optional(),
    targetValue: z.number().optional(),
    actualValue: z.number().optional(),
    unit: z.string().trim().optional(),
  })
  .refine((v) => v.projectId || v.ideaId, {
    message: "An impact measurement must reference a project or an idea.",
  });

export const markNotificationReadSchema = z.object({
  notificationId: uuid,
});

export const updateProjectDetailsSchema = z.object({
  projectId: uuid,
  name: z.string().trim().min(3).max(300).optional(),
  description: z.string().trim().min(1).optional(),
  ownerId: uuid.optional(),
  budget: z.number().nonnegative().optional(),
  baseline: z.number().nonnegative().optional(),
  actualCost: z.number().nonnegative().optional(),
  startDate: z.string().datetime().optional(),
  expectedCompletionDate: z.string().datetime().optional(),
});

export const archiveProjectSchema = z.object({
  projectId: uuid,
});

export const removeProjectMemberSchema = z.object({
  projectId: uuid,
  userId: uuid,
});

export const assignTaskSchema = z.object({
  taskId: uuid,
  assigneeId: uuid.nullable(),
});

export const updateRiskSchema = z.object({
  riskId: uuid,
  status: z.enum(["OPEN", "MITIGATED", "CLOSED"]).optional(),
  level: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  mitigationPlan: z.string().trim().optional(),
  blocker: z.boolean().optional(),
});

export const updateMilestoneStatusSchema = z.object({
  milestoneId: uuid,
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "DELAYED"]),
});

export const updateRequirementStatusSchema = z.object({
  requirementId: uuid,
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE"]),
});

export const updateCommentSchema = z.object({
  commentId: uuid,
  content: z.string().trim().min(1).max(10_000),
});

export const deleteAttachmentSchema = z.object({
  attachmentId: uuid,
});

export const updateKpiValueSchema = z.object({
  kpiId: uuid,
  currentValue: z.number(),
});

export const updateStrategicGoalSchema = z.object({
  goalId: uuid,
  name: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().min(1).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  currentValue: z.number().optional(),
  progressPercentage: z.number().int().min(0).max(100).optional(),
});

export const listAuditLogsSchema = z.object({
  organizationId: uuid,
  entityType: z.string().trim().optional(),
  entityId: uuid.optional(),
  userId: uuid.optional(),
  limit: z.number().int().positive().max(500).optional(),
});

/**
 * Phase 6, Group E addition — the list-side of every Group E sub-resource
 * was built as a service function only (Phase 5); no UI consumed it yet.
 * Each schema mirrors its service function's own signature exactly, so no
 * new query surface is invented — just the missing action's input shape.
 */
export const listRequirementsForProjectSchema = z.object({
  projectId: uuid,
});

export const listMilestonesForProjectSchema = z.object({
  projectId: uuid,
});

export const listTasksForProjectSchema = z.object({
  projectId: uuid,
});

export const listProjectMembersSchema = z.object({
  projectId: uuid,
});

export const listRisksForProjectSchema = z.object({
  projectId: uuid,
});

export const listProjectUpdatesSchema = z.object({
  projectId: uuid,
});

export const listKpisForSubjectSchema = z
  .object({
    projectId: uuid.optional(),
    ideaId: uuid.optional(),
    strategicGoalId: uuid.optional(),
  })
  .refine((v) => v.projectId || v.ideaId || v.strategicGoalId, {
    message: "A KPI list request must reference a project, idea, or strategic goal.",
  });

export const listImpactMeasurementsForSubjectSchema = z
  .object({
    projectId: uuid.optional(),
    ideaId: uuid.optional(),
  })
  .refine((v) => v.projectId || v.ideaId, {
    message: "An impact measurement list request must reference a project or an idea.",
  });

export const listAttachmentsForEntitySchema = z.object({
  entityType: z.enum(["IDEA", "PROJECT", "EVALUATION", "PROJECT_DOCUMENT", "INFORMATION_REQUEST", "COMMENT"]),
  entityId: uuid,
});

/**
 * Phase 6, Group F addition — listStrategicGoals/listMyNotifications were
 * built as service functions only (Phase 5); no UI consumed them yet. Each
 * schema mirrors its service function's own signature, matching the
 * {organizationId} shape listIdeasSchema/listProjectsSchema already use for
 * the same purpose. markAllNotificationsRead is new backend capability
 * (approved) — scoped to organizationId only, since the service itself
 * always scopes the UPDATE to the authenticated actor's own recipient_id.
 */
export const listStrategicGoalsSchema = z.object({
  organizationId: uuid,
});

export const listMyNotificationsSchema = z.object({
  organizationId: uuid,
  onlyUnread: z.boolean().optional(),
});

export const markAllNotificationsReadSchema = z.object({
  organizationId: uuid,
});
