import type { User, Organization } from '@innovator/types/common';
import type { Idea } from '@innovator/features/ideas/types';
import type { Project } from '@innovator/features/projects/types';
import type { Notification } from '@innovator/features/notifications/types';

/**
 * In-memory seed data for mock services.
 *
 * These values are illustrative only — NOT confirmed business data, file
 * limits, or categories. They exist purely so the UI has something to
 * render while there is no backend. Replace wholesale in Phase 10.
 */

export const MOCK_CURRENT_USER: User = {
  id: 'user-1',
  fullName: 'سارة العتيبي',
  email: 'sara.alotaibi@example.com',
  phone: '+966500000000',
};

export const MOCK_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-1',
    slug: 'baladi-tech',
    name: 'هيئة بلدي للتقنية',
    description: 'جهة حكومية تُعنى بتطوير الخدمات التقنية البلدية.',
  },
  {
    id: 'org-2',
    slug: 'noor-health',
    name: 'مجموعة نور الصحية',
    description: 'مجموعة رعاية صحية تستقبل أفكار تحسين تجربة المرضى.',
  },
];

// Demo-data cleanup (Phase 6 post-remediation): seeded demo values removed.
// Zero consumers confirmed — the Innovator's real idea forms fetch
// categories from the real backend, not this array.
export const MOCK_CATEGORIES: string[] = [];

let ideaCounter = 4;
export function nextIdeaId(): string {
  ideaCounter += 1;
  return `idea-${ideaCounter}`;
}

// Demo-data cleanup (Phase 6 post-remediation): seeded demo rows removed.
// Zero consumers confirmed — not imported outside this file; the real
// NeonIdeaService is the Innovator interface's only idea data source.
export const MOCK_IDEAS: Idea[] = [];

// Demo-data cleanup (Phase 6 post-remediation): seeded demo rows removed.
// Zero consumers confirmed — not imported outside this file; the real
// NeonProjectService is the Innovator interface's only project data source.
export const MOCK_PROJECTS: Project[] = [];

// Demo-data cleanup (Phase 6 post-remediation): seeded demo rows removed.
// Zero consumers confirmed — not imported outside this file; the real
// NeonNotificationService is the Innovator interface's only notification
// data source.
export const MOCK_NOTIFICATIONS: Notification[] = [];
