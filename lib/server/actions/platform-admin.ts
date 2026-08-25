"use server";

/**
 * The Super Admin's own profile/session information (approved capability
 * group 5). Deliberately its own tiny action rather than an extension of
 * lib/server/actions/auth.ts's SessionUser — that file/type is shared by
 * the three existing interfaces (Org Admin, Innovation Specialist,
 * Innovator) via getSessionUserAction(), which this phase's instructions
 * say not to redesign. A platform admin also has no
 * organization_memberships (by construction), so SessionUser's
 * organizationId/role fields would always be null for them anyway — a
 * dedicated, narrower type is clearer than overloading that one.
 */
import { runAction, UnauthenticatedError, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser, requirePlatformAdmin } from "@/lib/server/auth/guards";
import { getCurrentSessionIdentity } from "@/lib/server/auth/session";

export interface PlatformAdminProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export async function getPlatformAdminProfileAction(): Promise<ActionResult<PlatformAdminProfile>> {
  return runAction(async () => {
    const actor = await requireActiveUser();
    requirePlatformAdmin(actor);

    const identity = await getCurrentSessionIdentity();
    if (!identity) throw new UnauthenticatedError();

    return {
      id: identity.userId,
      email: identity.email,
      name: identity.name ?? identity.email,
      avatarUrl: identity.image ?? null,
    };
  });
}
