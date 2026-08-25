import type { Organization } from '@innovator/types/common';
import type { ActionModel } from '@innovator/types/actions';

export interface PublicOrganizationViewModel {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  /** Always enabled — where the primary CTA points depends on whether the visitor already has a session. */
  primaryAction: ActionModel;
  /** Only present for anonymous visitors (an existing-account login shortcut). */
  secondaryAction?: ActionModel;
}

/**
 * Whether the visitor is authenticated is the only thing that changes this
 * page's call to action — logged in → straight to Submit Idea (with this
 * organization pre-selected); anonymous → register (with a login shortcut
 * for returning innovators). No component downstream needs to know this
 * logic; it only ever sees the resolved `ActionModel`s.
 */
export function mapOrganizationToPublicViewModel(
  organization: Organization,
  isAuthenticated: boolean,
): PublicOrganizationViewModel {
  return {
    id: organization.id,
    name: organization.name,
    description: organization.description,
    logoUrl: organization.logoUrl,
    primaryAction: isAuthenticated
      ? { enabled: true, label: 'تقديم فكرة جديدة', route: `/innovator/ideas/new?organizationId=${organization.id}` }
      : { enabled: true, label: 'تسجيل حساب جديد', route: `/organizations/${organization.slug}/register` },
    secondaryAction: isAuthenticated
      ? undefined
      : { enabled: true, label: 'لدي حساب بالفعل — تسجيل الدخول', route: '/innovator/login' },
  };
}
