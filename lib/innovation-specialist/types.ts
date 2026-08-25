import type { ComponentType } from "react";
export type NavigationItem = { label: string; href: string; icon: ComponentType<{ className?: string }> };
export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export type IdeaStatus = "جديدة" | "بانتظار المراجعة" | "تحتاج استكمال" | "قيد التقييم" | "جاهزة للتوصية" | "تم رفع التوصية" | "معادة للمراجعة";
export type IdeaPriority = "منخفضة" | "متوسطة" | "عالية" | "عاجلة";

export type IdeaListItem = {
  id: string;
  title: string;
  innovator: string;
  innovatorType: "فرد" | "فريق ابتكار";
  category: string;
  status: IdeaStatus;
  priority: IdeaPriority;
  organizationId: string;
  assignedSpecialistId: string;
  assignedDate: string;
  submittedDate: string;
  lastUpdated: string;
};

export type IdeaSubmissionDetails = {
  title: string;
  receivingOrganization: string;
  category: string;
  description: string;
  problem: string;
  solution: string;
  expectedImpact: string;
  attachments: readonly string[];
};

export type ProjectStatus = "قيد التخطيط" | "قيد التنفيذ" | "متعثر" | "معلق" | "مكتمل";

export type ProjectFollowUpAssignment = {
  projectId: string;
  organizationId: string;
  specialistId: string;
  assignedDate: string;
};

export type ProjectListItem = {
  id: string;
  name: string;
  ideaId: string;
  ideaTitle: string;
  manager: string;
  // Phase 6, Group D: `phase` and `priority` have no real backend column
  // (see db/migrations/0005_project_delivery.sql's `projects` table) — for
  // a real project these are simply absent (undefined), never fabricated.
  // Kept required for the pre-existing mock data (mock-data.ts), which
  // still sets every one of these fields.
  phase?: string;
  status: ProjectStatus;
  priority?: IdeaPriority;
  completion: number;
  openRequirements: number;
  lastUpdate: string;
  updatePeriod: "today" | "week" | "older";
  action: "عرض المشروع" | "متابعة المتطلبات" | "إضافة تحديث" | "مراجعة الجدول الزمني";
  attentionReason?: string;
};
