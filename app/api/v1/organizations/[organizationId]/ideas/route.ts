/**
 * Representative Route Handler demonstrating the Route-Handler half of the
 * architecture (Server Actions cover the rest — see lib/server/actions/**).
 * GET lists ideas in an organization; POST creates one. Both go through the
 * exact same service layer as the Server Actions (createIdea,
 * listIdeasForOrganization) — a Route Handler is just a different transport
 * for the same authorized, validated operation, never a bypass of it.
 *
 * Not called from any page yet, per Phase 5's "do not wire the UI" scope —
 * this exists to satisfy "build API/service contracts... but do NOT wire
 * the UI to them yet."
 */
import { NextResponse, type NextRequest } from "next/server";
import { runAction, httpStatusForCode } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { createIdeaSchema } from "@/lib/server/validation/schemas";
import { createIdea, listIdeasForOrganization, type IdeaRow } from "@/lib/server/services/ideas";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await ctx.params;
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const submitterId = request.nextUrl.searchParams.get("submitterId") ?? undefined;

  const result = await runAction(async () => {
    const actor = await requireActiveUser();
    return listIdeasForOrganization(actor, organizationId, {
      // Cast is safe: the service itself only ever compares this against
      // known IdeaStatus values in a parameterized query — an invalid value
      // simply matches zero rows, it can't affect the query shape.
      status: status as IdeaRow["status"] | undefined,
      submitterId,
    });
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: httpStatusForCode(result.code) });
  }
  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await ctx.params;
  const body = await request.json().catch(() => null);

  const result = await runAction(async () => {
    const parsed = createIdeaSchema.parse({ ...body, organizationId });
    const actor = await requireActiveUser();
    return createIdea(actor, parsed);
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: httpStatusForCode(result.code) });
  }
  return NextResponse.json(result, { status: 201 });
}
