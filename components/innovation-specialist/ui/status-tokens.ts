import type { IdeaPriority, IdeaStatus, ProjectStatus, StatusTone } from "@/lib/innovation-specialist/types";

export const ideaStatusTones: Record<IdeaStatus, StatusTone> = {
  "جديدة": "info",
  "بانتظار المراجعة": "warning",
  "تحتاج استكمال": "danger",
  "قيد التقييم": "info",
  "جاهزة للتوصية": "success",
  "تم رفع التوصية": "neutral",
  "معادة للمراجعة": "danger"
};

export const projectStatusTones: Record<ProjectStatus, StatusTone> = {
  "قيد التخطيط": "info",
  "قيد التنفيذ": "success",
  "متعثر": "danger",
  "معلق": "warning",
  "مكتمل": "neutral"
};

export const priorityTones: Record<IdeaPriority, StatusTone> = {
  "منخفضة": "neutral",
  "متوسطة": "warning",
  "عالية": "danger",
  "عاجلة": "danger"
};
