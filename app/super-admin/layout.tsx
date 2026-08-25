import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/server/auth/session";
import { SuperAdminShell } from "@/components/super-admin/shell";

/**
 * Server-side route guard for the entire app/super-admin/** tree — the
 * ONLY gate a request needs to pass to render any Super Admin page.
 * Deliberately checks `actor.isPlatformAdmin` here (resolved by
 * getCurrentActor() from the dedicated `platform_admins` table — see
 * lib/server/auth/session.ts), NOT any route-visibility trick and NOT
 * `organization_memberships`. This mirrors app/org/layout.tsx's own
 * defense-in-depth pattern (proxy.ts is the primary enforcement layer for
 * matched routes; this layout is what actually runs the check today) but
 * for platform scope instead of org scope. Every Server Action this
 * interface calls independently re-checks requirePlatformAdmin() itself —
 * this layout guard is a rendering convenience (redirect before a
 * non-admin ever sees the shell), not the authorization boundary.
 *
 * This is a NEW, isolated interface — it does not import AppShell or any
 * of the three existing interfaces' layout/sidebar/header components.
 */
export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();
  if (!actor || !actor.isPlatformAdmin) {
    redirect("/login");
  }
  return <SuperAdminShell>{children}</SuperAdminShell>;
}
