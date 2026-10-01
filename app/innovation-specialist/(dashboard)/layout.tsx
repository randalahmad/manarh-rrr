import { redirect } from "next/navigation";
import { AppShell } from "@/components/innovation-specialist";
import { getCurrentActor } from "@/lib/mock-server/auth/session";

// Server-side route guard, per Phase 6 Group A — see app/org/layout.tsx for
// the same pattern and rationale (proxy.ts is the primary net).
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect("/innovation-specialist/login");
  }
  return <AppShell>{children}</AppShell>;
}
