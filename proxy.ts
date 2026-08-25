/**
 * Next.js 16 Proxy (the renamed successor to `middleware.ts` — see
 * node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md).
 *
 * Phase 5 scoped this to ONLY `/api/v1/**`. Phase 6 Group A widens it to
 * also cover the three interfaces' authenticated page routes — `/org/**`,
 * `/innovation-specialist/**` (excluding its own login page), and
 * `/innovator/**` (excluding its login/forgot-password/public-registration
 * pages) — since this is the ONE place route protection can be enforced
 * uniformly across all three interfaces before a page ever renders. The
 * innovator interface in particular has no server-side layout guard (its
 * layouts are client components using react-router-shim's <Outlet/>, and
 * its own session check in InnovatorLayout.tsx is client-side only), so for
 * that interface this proxy IS the primary enforcement point, not just
 * defense-in-depth.
 *
 * Each protected segment redirects to ITS OWN login page (three separate
 * `.middleware()` calls with different `loginUrl`s) — there is one shared
 * Neon Auth session, but three distinct front doors, matching the existing
 * per-interface login pages this phase wires up.
 *
 * This is still not a substitute for in-function checks: per Next's own
 * guidance ("Framework protections are not a substitute for
 * application-level checks"), every Server Action and Route Handler also
 * calls requireActiveUser()/requirePermission() itself — a Server Action is
 * a direct POST endpoint this path-based proxy cannot meaningfully gate on
 * its own, and org-membership/permission checks are per-organization, which
 * this proxy has no way to know.
 *
 * `/api/v1/health` is explicitly carved out below: infra liveness/readiness
 * probes must be reachable without a session, and the route itself performs
 * no authenticated action (it only runs `SELECT 1`).
 */
import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/server/auth/neon-auth";

/** Path prefixes that must stay reachable without a session — the front doors themselves, plus the innovator interface's public organization pages. */
const PUBLIC_PREFIXES = [
  "/innovation-specialist/login",
  "/innovator/login",
  "/innovator/forgot-password",
  "/innovator/organizations",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/api/v1/health") {
    return NextResponse.next();
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/org")) {
    return getAuth().middleware({ loginUrl: "/login" })(request);
  }

  if (pathname.startsWith("/innovation-specialist")) {
    return getAuth().middleware({ loginUrl: "/innovation-specialist/login" })(request);
  }

  if (pathname.startsWith("/innovator")) {
    return getAuth().middleware({ loginUrl: "/innovator/login" })(request);
  }

  // /api/v1/** (everything else the matcher lets through)
  return getAuth().middleware({ loginUrl: "/login" })(request);
}

export const config = {
  matcher: ["/api/v1/:path*", "/org/:path*", "/innovation-specialist/:path*", "/innovator/:path*"],
};
