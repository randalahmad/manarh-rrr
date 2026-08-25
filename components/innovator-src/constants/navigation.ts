import { LayoutDashboard, Lightbulb, PlusCircle, FolderKanban, Bell } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** When true, only match the exact path (used for the dashboard root link). */
  exact?: boolean;
}

export const INNOVATOR_NAV_ITEMS: NavItem[] = [
  { label: 'الرئيسية', to: '/innovator/dashboard', icon: LayoutDashboard, exact: true },
  { label: 'أفكاري', to: '/innovator/ideas', icon: Lightbulb },
  { label: 'تقديم فكرة', to: '/innovator/ideas/new', icon: PlusCircle, exact: true },
  { label: 'مشاريعي', to: '/innovator/projects', icon: FolderKanban },
  { label: 'الإشعارات', to: '/innovator/notifications', icon: Bell, exact: true },
];
