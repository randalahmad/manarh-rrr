import type { StatusTone } from '@innovator/types/status';

/** The 5 summary numbers shown by the stat cards. Pure data — no UI concerns (icons, colors) live here. */
export interface DashboardSummary {
  totalIdeas: number;
  underReview: number;
  needsInformation: number;
  approved: number;
  projectsCount: number;
}

/** A single quick-action entry. Modeled as a list (not a single button) so more actions can be added later without changing DashboardPage. `icon` is a string key (not a component reference) — resolved locally in the page, same pattern as ActivityTimeline/NotificationItem. */
export interface DashboardQuickAction {
  id: string;
  label: string;
  to: string;
  icon: string;
}

/** One status's share of the innovator's own ideas — every field computed from the real ideas list, never invented. */
export interface DashboardStatusDistributionItem {
  status: string;
  label: string;
  tone: StatusTone;
  count: number;
  /** 0–100, rounded, computed from count/total. */
  percentage: number;
}

/** Generic "needs your attention" item — decoupled from Idea. Could represent an idea, a project requirement, or anything else that needs a required action surfaced. */
export interface DashboardRequiredAction {
  id: string;
  title: string;
  description: string;
  status: {
    label: string;
    tone: StatusTone;
  };
  /** Optional freeform context (e.g. organization name, date) rendered as a small secondary line. */
  metadata?: string;
  primaryAction: {
    label: string;
    to: string;
  };
}

export type DashboardActivityCategory = 'idea' | 'project' | 'general';

/** Generic activity feed entry — decoupled from the Notification feature's own model. */
export interface DashboardRecentActivity {
  id: string;
  category: DashboardActivityCategory;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  to?: string;
}
