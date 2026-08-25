import type { Organization } from '@innovator/types/common';
import { MOCK_ORGANIZATIONS } from './mock/data';
import { mockDelay } from './mock/utils';
import { listMyOrganizationsAction } from '@/lib/server/actions/organizations';
import { listIdeaCategoriesAction } from '@/lib/server/actions/idea-categories';
import type { ActionResult } from '@/lib/server/errors';

/** Enough to populate a category `<Select>` — id (submitted to the backend) + display name. */
export interface CategoryOption {
  id: string;
  name: string;
}

/**
 * organizationService abstraction.
 *
 * `NeonOrganizationService` (Phase 6, Group B) is the real implementation
 * for `list`/`listCategories`, wired via Server Actions
 * (lib/server/actions/organizations.ts, idea-categories.ts).
 *
 * `getBySlug` stays mocked: the public organization page is out of scope
 * for this phase (no `slug` column exists on the real `organizations`
 * table, and no Server Action resolves an org by a public identifier).
 *
 * `listCategories` now takes the organization id explicitly — categories
 * are a per-organization concept on the real backend (`idea_categories.organization_id`
 * is `NOT NULL`), unlike the old mock's single global list.
 */
export interface OrganizationService {
  list(): Promise<Organization[]>;
  getBySlug(slug: string): Promise<Organization>;
  listCategories(organizationId: string): Promise<CategoryOption[]>;
}

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

class NeonOrganizationService implements OrganizationService {
  async list(): Promise<Organization[]> {
    const orgs = unwrap(await listMyOrganizationsAction());
    return orgs.map((org) => ({
      id: org.id,
      // No real `slug` column exists — synthesized as the id itself. Only
      // meaningfully consumed by the out-of-scope public org page
      // (getBySlug, still mocked below), so this is a harmless placeholder.
      slug: org.id,
      name: org.name,
      logoUrl: org.logo_url ?? undefined,
    }));
  }

  async getBySlug(slug: string): Promise<Organization> {
    // Out of scope for Phase 6 (public registration/org pages have no real
    // backend capability yet) — kept mocked and reported as such.
    const org = MOCK_ORGANIZATIONS.find((o) => o.slug === slug);
    if (!org) throw new Error('الجهة غير موجودة.');
    return mockDelay(org, 400);
  }

  async listCategories(organizationId: string): Promise<CategoryOption[]> {
    const categories = unwrap(await listIdeaCategoriesAction({ organizationId, activeOnly: true }));
    return categories.map((c) => ({ id: c.id, name: c.name }));
  }
}

export const organizationService: OrganizationService = new NeonOrganizationService();
