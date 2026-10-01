import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentActor } from "@/lib/mock-server/auth/session";

// Server-side route guard, per Phase 6 Group A. proxy.ts's widened matcher
// is the primary enforcement layer (redirects before this ever renders);
// this is defense-in-depth for any request that reaches the layout without
// a valid session — e.g. a stale/tampered cookie.
export const dynamic = "force-dynamic";

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect("/login");
  }
  return <AppShell>{children}</AppShell>;
}
