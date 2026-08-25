import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { IdeaStatus, ProjectStatus, DecisionType, RecommendationType, AccountStatus, UserRole, SubmitterType, UserType } from "./types";

export function cn(...inputs:ClassValue[]){return twMerge(clsx(inputs));}
export function formatDate(iso:string){return new Intl.DateTimeFormat("ar-SA-u-ca-gregory",{year:"numeric",month:"short",day:"numeric"}).format(new Date(iso));}
export function formatDateTime(iso:string){return new Intl.DateTimeFormat("ar-SA-u-ca-gregory",{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(iso));}
export function timeAgo(iso:string){const d=Date.now()-new Date(iso).getTime(),m=Math.floor(d/60000);if(m<1)return"الآن";if(m<60)return`منذ ${m} د`;const h=Math.floor(m/60);if(h<24)return`منذ ${h} س`;const days=Math.floor(h/24);if(days<30)return`منذ ${days} يوم`;const mo=Math.floor(days/30);return mo<12?`منذ ${mo} شهر`:`منذ ${Math.floor(mo/12)} سنة`;}
export const formatNumber=(n:number)=>new Intl.NumberFormat("ar-SA").format(n);
export const formatPercent=(n:number)=>`${formatNumber(n)}%`;

export const IDEA_STATUS_LABELS:Record<IdeaStatus,string>={
 DRAFT:"مسودة",SUBMITTED:"مُقدَّمة",INITIAL_SCREENING:"الفرز الأولي",UNDER_REVIEW:"قيد المراجعة",
 NEEDS_INFORMATION:"بانتظار معلومات إضافية",UNDER_EVALUATION:"قيد التقييم",RECOMMENDATION_SUBMITTED:"التوصية مرفوعة",
 PENDING_DECISION:"بانتظار القرار",APPROVED:"معتمدة",CONDITIONALLY_APPROVED:"اعتماد مشروط",IDEA_DEVELOPMENT:"تطوير الفكرة",
 CONVERTED_TO_PROJECT:"تحولت إلى مشروع",DEFERRED:"مؤجَّلة",RETURNED_FOR_REVIEW:"أُعيدت للمراجعة",NOT_PURSUED:"غير مُتابَعة",
 REJECTED:"مرفوضة",WITHDRAWN:"مسحوبة",ARCHIVED:"مؤرشفة"
};
export const IDEA_STATUS_TONE:Record<IdeaStatus,"neutral"|"info"|"warning"|"success"|"danger">={
 DRAFT:"neutral",SUBMITTED:"info",INITIAL_SCREENING:"info",UNDER_REVIEW:"info",NEEDS_INFORMATION:"warning",UNDER_EVALUATION:"info",
 RECOMMENDATION_SUBMITTED:"info",PENDING_DECISION:"warning",APPROVED:"success",CONDITIONALLY_APPROVED:"success",IDEA_DEVELOPMENT:"info",
 CONVERTED_TO_PROJECT:"success",DEFERRED:"neutral",RETURNED_FOR_REVIEW:"warning",NOT_PURSUED:"danger",REJECTED:"danger",WITHDRAWN:"danger",ARCHIVED:"neutral"
};
export const PROJECT_STATUS_LABELS:Record<ProjectStatus,string>={
 PROJECT_CREATED:"تم إنشاء المشروع",DEVELOPMENT:"التطوير",PLANNING:"التخطيط",ASSIGN_STAKEHOLDERS:"تحديد الأطراف",
 DEFINE_REQUIREMENTS:"تحديد المتطلبات",DEFINE_TIMELINE:"تحديد الجدول",EXECUTION:"التنفيذ",TESTING:"الاختبار",LAUNCH:"الإطلاق",
 IN_PROGRESS:"قيد التنفيذ",BLOCKED:"متعثر",ON_HOLD:"متوقف مؤقتًا",COMPLETED:"مكتمل",CLOSED:"مغلق",ARCHIVED:"مؤرشف"
};
export const PROJECT_STATUS_TONE:Record<ProjectStatus,"neutral"|"info"|"warning"|"success"|"danger">={
 PROJECT_CREATED:"info",DEVELOPMENT:"info",PLANNING:"info",ASSIGN_STAKEHOLDERS:"info",DEFINE_REQUIREMENTS:"info",DEFINE_TIMELINE:"info",
 EXECUTION:"success",TESTING:"info",LAUNCH:"success",IN_PROGRESS:"success",BLOCKED:"danger",ON_HOLD:"warning",COMPLETED:"success",CLOSED:"neutral",ARCHIVED:"neutral"
};
export const DECISION_TYPE_LABELS:Record<DecisionType,string>={
 APPROVE:"اعتماد",CONDITIONALLY_APPROVE:"اعتماد مشروط",CONVERT_TO_PROJECT:"تحويل إلى مشروع",DEFER:"تأجيل",REJECT:"رفض",REQUEST_INFORMATION:"طلب معلومات إضافية"
};
export const RECOMMENDATION_TYPE_LABELS:Record<RecommendationType,string>={
 APPROVE:"التوصية بالاعتماد",CONDITIONALLY_APPROVE:"التوصية باعتماد مشروط",CONVERT_TO_PROJECT:"التوصية بالتحويل إلى مشروع",DEFER:"التوصية بالتأجيل",REJECT:"التوصية بالرفض",REQUEST_INFORMATION:"التوصية بطلب معلومات"
};
export const ACCOUNT_STATUS_LABELS:Record<AccountStatus,string>={ACTIVE:"نشط",SUSPENDED:"مُعلَّق",DISABLED:"مُعطَّل",PENDING_ACTIVATION:"بانتظار التفعيل"};
export const ACCOUNT_STATUS_TONE:Record<AccountStatus,"neutral"|"info"|"warning"|"success"|"danger">={ACTIVE:"success",SUSPENDED:"warning",DISABLED:"danger",PENDING_ACTIVATION:"info"};
export const ROLE_LABELS:Record<UserRole,string>={SUPER_ADMIN:"إدارة منصة منارة",ORG_ADMIN:"مسؤول الجهة",INNOVATION_SPECIALIST:"أخصائي الابتكار",INTERNAL_INNOVATOR:"مبتكر داخلي",EXTERNAL_INNOVATOR:"مبتكر خارجي",EVALUATOR:"مقيّم",PROJECT_MANAGER:"مدير مشروع"};
export const USER_TYPE_LABELS:Record<UserType,string>={SUPER_ADMIN:"مسؤول المنصة",ORG_USER:"مستخدم جهة",INNOVATOR:"مبتكر داخلي",EXTERNAL_INNOVATOR:"مبتكر خارجي"};
export const SUBMITTER_TYPE_LABELS:Record<SubmitterType,string>={INTERNAL:"مبتكر داخلي",EXTERNAL:"مبتكر خارجي"};
export function initials(name:string){const p=name.trim().split(/\s+/);return p.length===1?p[0].slice(0,2):p[0][0]+p[1][0];}
