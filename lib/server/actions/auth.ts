"use server";

/**
 * Server Actions for authentication — Group A (Phase 6).
 *
 * Shared across all three interfaces (Org Admin, Innovation Specialist,
 * Innovator): sign-in, sign-out, and "who is currently signed in" all go
 * through Neon Auth's server methods directly (auth.signIn.email /
 * auth.signOut / auth.getSession), per @neondatabase/auth's own documented
 * Server Action pattern — no client-side auth SDK/provider is used.
 *
 * This module does NOT introduce a second identity/session system: it is a
 * thin, typed wrapper around lib/server/auth/neon-auth.ts's getAuth() and
 * lib/server/auth/session.ts's existing session-resolution helpers. Every
 * failure is surfaced as an ActionResult (via runAction) rather than a raw
 * thrown error, matching every other Server Action in this codebase.
 */
import { z } from "zod";
import { getAuth } from "@/lib/server/auth/neon-auth";
import {
  getCurrentActor,
  getCurrentUserProfile,
  getCurrentSessionIdentity,
} from "@/lib/server/auth/session";
import { query } from "@/lib/server/db";
import { runAction, UnauthenticatedError, ForbiddenError, type ActionResult } from "@/lib/server/errors";
import type { ActorMembership } from "@/lib/server/rbac/permissions";

const signInSchema = z.object({
  email: z.string().min(1, "البريد الإلكتروني مطلوب.").email("صيغة البريد الإلكتروني غير صحيحة."),
  password: z.string().min(1, "كلمة المرور مطلوبة."),
});

/**
 * The client-safe "who am I" payload every interface's session state is
 * built from. Deliberately does not expose the full Actor (grants list,
 * every membership) — that stays server-side; the UI only needs enough to
 * render a name/avatar and know which single organization/role is active
 * for this interface.
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  /** The active organization membership for this session, if any. A user with zero ACTIVE memberships can still be authenticated (e.g. an EXTERNAL_INNOVATOR — see note below) but has no org-scoped role. */
  organizationId: string | null;
  role: ActorMembership["role"] | null;
}

interface AvatarRow {
  avatar_url: string | null;
}

/**
 * Resolves the full SessionUser payload for the current request. Returns
 * null if there is no session at all. Does NOT throw ForbiddenError for a
 * signed-in user with no organization membership (e.g. an external
 * innovator, who is intentionally never a member of any organization per
 * the architecture) — callers that require an active org membership use
 * requireActiveUser()/requireOrgMembership() from guards.ts, same as every
 * other Server Action.
 */
async function loadSessionUser(): Promise<SessionUser | null> {
  const identity = await getCurrentSessionIdentity();
  if (!identity) return null;

  const [actor, avatarRow] = await Promise.all([
    getCurrentActor(),
    query<AvatarRow>(`SELECT avatar_url FROM user_profiles WHERE id = $1`, [identity.userId]).then(
      (rows) => rows[0] ?? null
    ),
  ]);

  const primaryMembership: ActorMembership | undefined = actor?.memberships[0];

  return {
    id: identity.userId,
    email: identity.email,
    name: identity.name ?? identity.email,
    avatarUrl: avatarRow?.avatar_url ?? identity.image ?? null,
    organizationId: primaryMembership?.organizationId ?? null,
    role: primaryMembership?.role ?? null,
  };
}

/** Maps Neon Auth's own error shape to the Arabic-facing messages the three login pages already display for invalid credentials — never leaks the provider's raw error text. */
function signInErrorMessage(): string {
  return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
}

export async function signInAction(input: unknown): Promise<ActionResult<SessionUser>> {
  return runAction(async () => {
    const { email, password } = signInSchema.parse(input);
    const auth = getAuth();
    const { error } = await auth.signIn.email({ email, password });
    if (error) {
      throw new UnauthenticatedError(signInErrorMessage());
    }

    const user = await loadSessionUser();
    if (!user) {
      // Should not happen right after a successful sign-in — guard anyway
      // rather than returning a half-built payload.
      throw new UnauthenticatedError("تعذر إنشاء الجلسة. حاول مرة أخرى.");
    }

    const profile = await getCurrentUserProfile(user.id);
    if (profile && profile.status !== "ACTIVE") {
      // Sign the session back out — Neon Auth has already set the cookie
      // by this point, and a suspended/disabled/not-yet-activated account
      // must not be left signed in just because credentials matched.
      await auth.signOut();
      const messages: Record<Exclude<typeof profile.status, "ACTIVE">, string> = {
        SUSPENDED: "هذا الحساب موقوف. تواصل مع مسؤول النظام.",
        DISABLED: "هذا الحساب معطّل. تواصل مع مسؤول النظام.",
        PENDING_ACTIVATION: "لم يتم تفعيل هذا الحساب بعد.",
      };
      throw new ForbiddenError(messages[profile.status]);
    }

    return user;
  });
}

export async function signOutAction(): Promise<ActionResult<null>> {
  return runAction(async () => {
    await getAuth().signOut();
    return null;
  });
}

/** Read-only session check — used to hydrate client-side auth state (e.g. the innovator interface's AuthContext) without re-authenticating. */
export async function getSessionUserAction(): Promise<ActionResult<SessionUser | null>> {
  return runAction(async () => {
    return loadSessionUser();
  });
}
