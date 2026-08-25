import { getMyRoleInOrganizationAction } from '@/lib/server/actions/organizations';

/**
 * membershipService abstraction.
 *
 * Per the Phase 1 decision, `submitterType` (internal/external) is NEVER a
 * property of the user or the session — it's determined per-idea, at
 * submission time, from the user's relationship to the receiving
 * organization at that moment. This service is the only place that
 * relationship is checked.
 *
 * `NeonMembershipService` (Phase 6, Group B) is the real implementation:
 * `INTERNAL_INNOVATOR` and `EXTERNAL_INNOVATOR` are both real,
 * organization-scoped roles on `organization_memberships` (confirmed via
 * migration 0010's RBAC seed and Phase 4/5 fixtures — an external innovator
 * still gets a normal membership row, just with the EXTERNAL_INNOVATOR
 * role). `isInternalMember` resolves the actor's real role in the given
 * organization and checks it against that role, rather than guessing from a
 * hardcoded table.
 */
export interface MembershipService {
  isInternalMember(userId: string, organizationId: string): Promise<boolean>;
}

class NeonMembershipService implements MembershipService {
  async isInternalMember(_userId: string, organizationId: string): Promise<boolean> {
    // `userId` is accepted for interface compatibility with the mock, but
    // the real lookup is always for the CURRENT session's actor (resolved
    // server-side from the session, never trusted from the client) — there
    // is no capability to check a different user's membership from here.
    const result = await getMyRoleInOrganizationAction({ organizationId });
    if (!result.ok) {
      throw new Error(result.message);
    }
    return result.data === 'INTERNAL_INNOVATOR';
  }
}

export const membershipService: MembershipService = new NeonMembershipService();
