// ============================================================================
// MANARA — Core Data Models
// PRD + مراجعة واجهة مسؤول الجهة
// Discover → Evaluate → Execute → Impact
// ============================================================================

export type UserType = "SUPER_ADMIN" | "ORG_USER" | "INNOVATOR" | "EXTERNAL_INNOVATOR";
export type UserRole =
  | "SUPER_ADMIN" | "ORG_ADMIN" | "INNOVATION_SPECIALIST"
  | "INTERNAL_INNOVATOR" | "EXTERNAL_INNOVATOR"
  | "EVALUATOR" | "PROJECT_MANAGER";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DISABLED" | "PENDING_ACTIVATION";

export type PermissionScopeType = "SYSTEM" | "ORGANIZATION" | "DEPARTMENT" | "TEAM" | "PROJECT" | "IDEA";
export interface PermissionScope {
  type: PermissionScopeType;
  organizationId?: string;
  departmentId?: string;
  teamId?: string;
  projectId?: string;
  ideaId?: string;
}
export type PermissionAction =
  | "VIEW" | "CREATE" | "EDIT" | "DELETE" | "ARCHIVE"
  | "EVALUATE" | "ASSIGN" | "APPROVE" | "EXPORT" | "MANAGE";
export type PermissionArea =
  | "AUTH" | "ORG" | "USER" | "IDEA" | "CHALLENGE" | "OPPORTUNITY"
  | "EVALUATION" | "GOVERNANCE" | "PROJECT" | "TASK" | "TEAM"
  | "RISK" | "KPI" | "IMPACT" | "NOTIFICATION" | "REPORT" | "AUDIT";

export interface Organization {
  id: string; name: string; nameEn?: string; description: string; logoUrl?: string;
  status: "ACTIVE" | "SUSPENDED"; contactEmail: string; contactPhone: string;
  sector: string; createdAt: string; updatedAt: string;
}
export interface User {
  id: string; organizationId: string; fullName: string; email: string; phone?: string; avatarUrl?: string;
  userType: UserType; role: UserRole; jobTitle?: string; department?: string; departmentId?: string;
  status: AccountStatus; statusReason?: string; createdAt: string; lastActivityAt?: string;
  ideasSubmitted?: number; ideasApproved?: number; projectsInvolved?: number;
}
export interface OrganizationMembership {
  id: string; userId: string; organizationId: string;
  membershipStatus: "ACTIVE" | "INACTIVE"; joinedAt: string; endedAt?: string | null;
  role?: UserRole; scope?: PermissionScope; teamIds?: string[]; managedProjectIds?: string[];
}
export interface Permission {
  id: string; area: PermissionArea; action: PermissionAction; actionAr: string;
  scope: PermissionScope; note?: string;
}
export interface Role {
  id: string; name: string; nameAr: string; description: string;
  isSystem: boolean; userCount: number; permissions: Permission[];
}

export type ChallengeOpportunityStatus = "DRAFT" | "OPEN" | "ACTIVE" | "CLOSED" | "ARCHIVED";
export interface InnovationChallenge {
  id: string; organizationId: string; title: string; description: string; status: ChallengeOpportunityStatus;
  strategicGoalId?: string; categoryIds: string[]; priority?: number;
  createdBy: string; createdAt: string; updatedAt: string; openDate?: string; closeDate?: string;
  linkedIdeasCount: number; usageCount?: number;
}
export interface InnovationOpportunity {
  id: string; organizationId: string; title: string; description: string; status: ChallengeOpportunityStatus;
  strategicGoalId?: string; categoryIds: string[]; priority?: number;
  createdBy: string; createdAt: string; updatedAt: string; openDate?: string; closeDate?: string;
  linkedIdeasCount: number; usageCount?: number;
}

export type IdeaStatus =
  | "DRAFT" | "SUBMITTED" | "INITIAL_SCREENING" | "UNDER_REVIEW" | "NEEDS_INFORMATION"
  | "UNDER_EVALUATION" | "RECOMMENDATION_SUBMITTED" | "PENDING_DECISION"
  | "APPROVED" | "CONDITIONALLY_APPROVED" | "IDEA_DEVELOPMENT" | "CONVERTED_TO_PROJECT"
  | "DEFERRED" | "RETURNED_FOR_REVIEW" | "NOT_PURSUED" | "REJECTED" | "WITHDRAWN" | "ARCHIVED";

export const IDEA_LIFECYCLE_ORDER: IdeaStatus[] = [
  "DRAFT","SUBMITTED","INITIAL_SCREENING","UNDER_REVIEW","NEEDS_INFORMATION","RETURNED_FOR_REVIEW",
  "UNDER_EVALUATION","RECOMMENDATION_SUBMITTED","PENDING_DECISION","APPROVED","CONDITIONALLY_APPROVED",
  "IDEA_DEVELOPMENT","CONVERTED_TO_PROJECT","DEFERRED","NOT_PURSUED","REJECTED","WITHDRAWN","ARCHIVED"
];
export type SubmitterType = "INTERNAL" | "EXTERNAL";

export interface IdeaCategory {
  id: string; organizationId: string; name: string; description: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED"; priority?: number; relatedIdeasCount: number;
  usageCount?: number; strategicGoalId?: string; challengeIds?: string[]; opportunityIds?: string[];
  createdAt: string;
}
export interface StrategicGoal {
  id: string; organizationId: string; name: string; description: string; status: "ACTIVE" | "ARCHIVED";
  targetValue?: number; currentValue?: number; unit?: string; measurementPeriodStart?: string;
  measurementPeriodEnd?: string; ownerId?: string; progressPercentage?: number;
  linkedIdeasCount: number; linkedProjectsCount?: number; createdAt: string;
}
export interface Attachment {
  id: string; fileName: string; fileType: string; sizeKb: number; uploadedAt: string; uploadedBy: string;
}
export interface Idea {
  id: string; organizationId: string; title: string; description: string; problemStatement: string;
  proposedSolution: string; expectedImpact: string; categoryId: string; strategicGoalIds: string[];
  challengeId?: string; opportunityId?: string; submitterId: string; submitterType: SubmitterType;
  status: IdeaStatus; submittedAt: string; updatedAt: string; attachments: Attachment[];
  projectId?: string; withdrawalReason?: string;
}
export interface IdeaStatusHistory {
  id: string; ideaId: string; fromStatus: IdeaStatus | null; toStatus: IdeaStatus;
  changedAt: string; changedBy: string; note?: string;
}
export type InformationRequestStatus = "OPEN" | "RESPONDED" | "CLOSED";
export interface InformationRequest {
  id: string; ideaId: string; requestedBy: string; requestText: string; status: InformationRequestStatus;
  requestedAt: string; responseText?: string; respondedBy?: string; respondedAt?: string; attachments?: Attachment[];
}
export interface Comment {
  id: string; entityType: "IDEA" | "PROJECT" | "CHALLENGE" | "OPPORTUNITY" | "TASK";
  entityId: string; authorId: string; content: string; createdAt: string; updatedAt?: string; attachments?: Attachment[];
}

export interface EvaluatorAssignment {
  id: string; ideaId: string; evaluatorId: string; assignedBy: string; assignedAt: string; dueAt?: string;
  status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "CANCELLED";
}
export interface Evaluation {
  id: string; ideaId: string; evaluatorId: string;
  strategicAlignmentScore: number; feasibilityScore: number; resourceReadinessScore: number;
  notes: string; attachments: Attachment[]; submittedAt: string;
}
export type RecommendationType =
  | "APPROVE" | "CONDITIONALLY_APPROVE" | "CONVERT_TO_PROJECT" | "DEFER" | "REJECT" | "REQUEST_INFORMATION";
export interface Recommendation {
  id: string; ideaId: string; evaluationId?: string; recommendationType: RecommendationType;
  summary: string; submittedBy: string; submittedAt: string;
}
export type DecisionType = RecommendationType;
export interface Decision {
  id: string; ideaId?: string; projectId?: string; recommendationId?: string; decisionType: DecisionType;
  reason: string; conditions?: string; notes?: string; attachments?: Attachment[]; decidedBy: string; decidedAt: string;
}

export type ProjectStatus =
  | "PROJECT_CREATED" | "DEVELOPMENT" | "PLANNING" | "ASSIGN_STAKEHOLDERS" | "DEFINE_REQUIREMENTS"
  | "DEFINE_TIMELINE" | "EXECUTION" | "TESTING" | "LAUNCH" | "IN_PROGRESS" | "BLOCKED"
  | "ON_HOLD" | "COMPLETED" | "CLOSED" | "ARCHIVED";
export const PROJECT_LIFECYCLE_ORDER: ProjectStatus[] = [
  "PROJECT_CREATED","DEVELOPMENT","PLANNING","ASSIGN_STAKEHOLDERS","DEFINE_REQUIREMENTS",
  "DEFINE_TIMELINE","EXECUTION","TESTING","LAUNCH","COMPLETED","CLOSED","ARCHIVED"
];
export interface Project {
  id: string; organizationId: string; ideaId: string; challengeId?: string; opportunityId?: string;
  strategicGoalIds?: string[]; name: string; description: string; ownerId: string; status: ProjectStatus;
  // Phase 6, Group D addition — mirrors projects.previous_active_status.
  // Only meaningful when status is BLOCKED/ON_HOLD; needed client-side to
  // compute the single legal "resume" destination (see
  // lib/server/workflow/project-status.ts's allowedProjectTransitions).
  previousActiveStatus?: ProjectStatus | null;
  progress: number; startDate: string; expectedCompletionDate: string; actualCompletionDate?: string;
  budget?: number; baseline?: number; actualCost?: number; createdAt: string; updatedAt: string;
}
export interface ProjectMember { id: string; projectId: string; userId: string; roleInProject: string; addedAt: string; }
export interface ProjectDocument { id:string; projectId:string; fileName:string; fileType:string; sizeKb:number; uploadedAt:string; uploadedBy:string; }
export interface ProjectRequirement {
  id: string; projectId: string; title: string; description: string; status: "PENDING" | "IN_PROGRESS" | "DONE"; dueDate?: string;
}
export interface ProjectUpdate {
  id: string; projectId: string; authorId: string; updateType: "STATUS_CHANGE" | "NOTE" | "MILESTONE" | "TIMELINE_CHANGE";
  content: string; createdAt: string;
}
export interface ProjectTask {
  id: string; projectId: string; title: string; description?: string; assigneeId?: string;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE"; priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate?: string; createdAt: string; updatedAt: string;
}
export interface ProjectMilestone {
  id: string; projectId: string; title: string; description?: string; dueDate: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
}
export interface Team {
  id: string; organizationId: string; name: string; description?: string; managerId?: string;
  memberIds: string[]; createdAt: string; updatedAt: string;
}
export type RiskStatus = "OPEN" | "MITIGATED" | "CLOSED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export interface ProjectRisk {
  id: string; projectId: string; title: string; description: string; level: RiskLevel; status: RiskStatus;
  ownerId?: string; mitigationPlan?: string; blocker?: boolean; createdAt: string; updatedAt: string;
}
export interface KPI {
  id: string; projectId?: string; ideaId?: string; strategicGoalId?: string; name: string; description?: string; unit: string;
  baselineValue?: number; targetValue: number; currentValue: number; measurementPeriodStart?: string;
  measurementPeriodEnd?: string; ownerId?: string; progressPercentage?: number; createdAt: string; updatedAt: string;
}
export type ImpactType = "FINANCIAL" | "OPERATIONAL" | "CUSTOMER" | "STRATEGIC" | "OTHER";
export interface ImpactMeasurement {
  id: string; projectId?: string; ideaId?: string; type: ImpactType; description: string;
  baselineValue?: number; targetValue?: number; actualValue?: number; unit?: string; measuredAt: string; measuredBy: string;
}
export interface InnovationRecord {
  id: string; organizationId: string; ideaId: string; projectId?: string; finalStatus: IdeaStatus;
  outcome?: string; impactMeasurementIds: string[]; closedAt?: string; archivedAt?: string;
}
export type NotificationEntityType =
  | "IDEA" | "DECISION" | "PROJECT" | "USER" | "ORGANIZATION" | "CHALLENGE"
  | "OPPORTUNITY" | "EVALUATION" | "TASK" | "IMPACT";
export interface Notification {
  id: string; organizationId: string; recipientId: string; title: string; message: string;
  entityType: NotificationEntityType; entityId: string; isRead: boolean; createdAt: string;
}
export interface NotificationTemplate {
  id: string; organizationId: string; event: string; eventAr: string;
  channel: "IN_APP" | "EMAIL"; subject: string; body: string; isActive: boolean;
}
export interface AuditLog {
  id: string; organizationId: string; timestamp: string; userId: string; userName: string;
  action: string; actionAr: string; entityType: string; entityId: string; previousState?: string; newState?: string;
  attachmentIds?: string[]; permissionSnapshot?: string; sensitiveView?: boolean; decisionDetails?: string;
  ipAddress: string; device: string; readonly?: boolean;
}

export interface WorkflowStageConfig {
  id: string; name: string; nameAr: string; order: number; enabled: boolean; durationDays: number;
  isSystemStage?: boolean; protected?: boolean;
}
export interface EvaluationCriterion {
  id: string; name: string; nameAr: string; description?: string; maxScore: number; weight?: number; isActive: boolean;
}
export interface EscalationRule {
  id: string; stageId: string; afterDays: number; notifyRole: UserRole; isActive: boolean;
}
export interface OrganizationSettings {
  organizationId: string; name: string; description: string; logoUrl?: string; notificationTemplates?: NotificationTemplate[];
  contactEmail: string; contactPhone: string; sector: string; status: "ACTIVE" | "SUSPENDED";
  workflow: {
    stages: WorkflowStageConfig[]; requireEvaluationBeforeDecision: boolean; allowIdeaWithdrawalAfterApproval: boolean;
    autoNotifyStakeholdersOnDecision: boolean; defaultDecisionSlaDays: number;
  };
  evaluation: { criteria: EvaluationCriterion[]; minimumEvaluators?: number; allowSelfEvaluation?: boolean; };
  escalationRules: EscalationRule[];
  notificationPreferences: {
    notifyOnNewIdea: boolean; notifyOnDecision: boolean; notifyOnProjectUpdate: boolean;
    dailyDigest: boolean; escalationEnabled: boolean;
  };
}
