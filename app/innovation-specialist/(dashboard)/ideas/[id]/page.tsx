import { IdeaDetailsClient } from "./idea-details-client";
import { notFound } from "next/navigation";
import { getIdeaAction } from "@/lib/server/actions/ideas";

export default async function IdeaDetailsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  // Real existence + RBAC guard (Phase 6, Group B) — replaces the old
  // mock-only `assignedIdeas.some(...)` check. getIdeaAction() resolves the
  // real session and calls getIdeaById(), which enforces requireOrgMembership
  // internally, so this 404s both for an id that doesn't exist and for one
  // that belongs to an organization the signed-in specialist isn't a member
  // of — never leaking which case it was.
  const result = await getIdeaAction({ ideaId: id });
  if (!result.ok) notFound();
  return <IdeaDetailsClient id={id} initialTab={tab} />;
}
