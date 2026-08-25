"use server";

/**
 * Server Actions for the Ideas domain. Every action: (1) validates shape
 * with a zod schema BEFORE touching the database, (2) resolves the actor
 * from the session (never trusts a client-supplied actor/user id), (3)
 * delegates to the service layer, which itself re-checks authorization and
 * organization scope, (4) returns a typed ActionResult via runAction() so
 * failures never leak raw internals to the client.
 *
 * These are NOT wired into any page/component yet — Phase 5 builds the
 * contract only, per the approved scope ("do NOT wire the UI to them yet").
 */
import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import {
  createIdeaSchema,
  transitionIdeaSchema,
  withdrawIdeaSchema,
  getIdeaSchema,
  listIdeasSchema,
  updateIdeaSchema,
} from "@/lib/server/validation/schemas";
import {
  createIdea,
  transitionIdeaStatus,
  withdrawIdea,
  getIdeaById,
  listIdeasForOrganization,
  updateIdea,
  listStatusHistoryForIdea,
  type IdeaRow,
  type IdeaStatusHistoryRow,
} from "@/lib/server/services/ideas";

export async function createIdeaAction(input: unknown): Promise<ActionResult<IdeaRow>> {
  return runAction(async () => {
    const parsed = createIdeaSchema.parse(input);
    const actor = await requireActiveUser();
    return createIdea(actor, parsed);
  });
}

/**
 * Read actions (Phase 6, Group B addition) — Phase 5 built getIdeaById /
 * listIdeasForOrganization as services only, since no frontend consumed
 * them yet. Every page in all three interfaces that needs idea data is a
 * Client Component (uses hooks/TanStack Query or plain client state, not
 * React Server Components), so reads need a Server Action boundary just
 * like mutations do — there is no Server Component call site to invoke the
 * service directly from.
 */
export async function getIdeaAction(input: unknown): Promise<ActionResult<IdeaRow>> {
  return runAction(async () => {
    const parsed = getIdeaSchema.parse(input);
    const actor = await requireActiveUser();
    return getIdeaById(actor, parsed.ideaId);
  });
}

export async function listIdeasAction(input: unknown): Promise<ActionResult<IdeaRow[]>> {
  return runAction(async () => {
    const parsed = listIdeasSchema.parse(input);
    const actor = await requireActiveUser();
    return listIdeasForOrganization(actor, parsed.organizationId, {
      status: parsed.status,
      submitterId: parsed.submitterId,
    });
  });
}

export async function updateIdeaAction(input: unknown): Promise<ActionResult<IdeaRow>> {
  return runAction(async () => {
    const parsed = updateIdeaSchema.parse(input);
    const actor = await requireActiveUser();
    const { ideaId, ...rest } = parsed;
    return updateIdea(actor, ideaId, rest);
  });
}

export async function listIdeaStatusHistoryAction(input: unknown): Promise<ActionResult<IdeaStatusHistoryRow[]>> {
  return runAction(async () => {
    const parsed = getIdeaSchema.parse(input);
    const actor = await requireActiveUser();
    return listStatusHistoryForIdea(actor, parsed.ideaId);
  });
}

export async function transitionIdeaStatusAction(input: unknown): Promise<ActionResult<IdeaRow>> {
  return runAction(async () => {
    const parsed = transitionIdeaSchema.parse(input);
    const actor = await requireActiveUser();
    return transitionIdeaStatus(actor, parsed.ideaId, parsed.toStatus, parsed.note);
  });
}

export async function withdrawIdeaAction(input: unknown): Promise<ActionResult<IdeaRow>> {
  return runAction(async () => {
    const parsed = withdrawIdeaSchema.parse(input);
    const actor = await requireActiveUser();
    return withdrawIdea(actor, parsed.ideaId, parsed.reason);
  });
}
