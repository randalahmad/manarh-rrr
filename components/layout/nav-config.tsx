import {
  LayoutDashboard, Users, ShieldCheck, Settings, Tags, Target, Lightbulb, Gavel, FolderKanban,
  BarChart3, ScrollText, Radar, Sparkles, ClipboardCheck, ListTodo, Activity, BookOpenCheck, UsersRound, ShieldAlert, GaugeCircle, MessageSquareMore
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem { href:string; label:string; icon:LucideIcon; }
export const NAV_ITEMS:NavItem[]=[
  {href:"/org/dashboard",label:"لوحة التحكم",icon:LayoutDashboard},
  {href:"/org/my-tasks",label:"مهامي",icon:ListTodo},
  {href:"/org/users",label:"المستخدمون",icon:Users},
  {href:"/org/roles-permissions",label:"الأدوار والصلاحيات",icon:ShieldCheck},
  {href:"/org/settings",label:"إعدادات الجهة",icon:Settings},
  {href:"/org/categories",label:"التصنيفات",icon:Tags},
  {href:"/org/strategic-goals",label:"الأهداف الاستراتيجية",icon:Target},
  {href:"/org/challenges",label:"التحديات الابتكارية",icon:Radar},
  {href:"/org/opportunities",label:"الفرص الابتكارية",icon:Sparkles},
  {href:"/org/ideas",label:"محفظة الأفكار",icon:Lightbulb},
  {href:"/org/evaluations",label:"التقييم والمقيمون",icon:ClipboardCheck},
  {href:"/org/information-requests",label:"طلبات المعلومات",icon:MessageSquareMore},
  {href:"/org/decisions",label:"قائمة القرارات",icon:Gavel},
  {href:"/org/projects",label:"محفظة المشاريع",icon:FolderKanban},
  {href:"/org/teams",label:"الفرق",icon:UsersRound},
  {href:"/org/risks",label:"المخاطر والمعوقات",icon:ShieldAlert},
  {href:"/org/kpis",label:"مؤشرات الأداء",icon:GaugeCircle},
  {href:"/org/impact",label:"قياس الأثر",icon:Activity},
  {href:"/org/innovation-register",label:"سجل الابتكار",icon:BookOpenCheck},
  {href:"/org/reports",label:"التقارير والمؤشرات",icon:BarChart3},
  {href:"/org/audit-logs",label:"سجل التدقيق",icon:ScrollText},
];
export const PAGE_TITLES:Record<string,string>=Object.fromEntries(NAV_ITEMS.map(i=>[i.href,i.label]));
PAGE_TITLES["/org/notifications"]="الإشعارات"; PAGE_TITLES["/org/profile"]="الملف الشخصي";
