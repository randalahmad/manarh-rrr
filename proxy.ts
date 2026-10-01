/**
 * Frontend-only prototype build: no Neon Auth, no DATABASE_URL. The real
 * proxy (lib/server/auth/neon-auth.ts-based) gated every request through a
 * live Neon Auth session; this build has no backend to check against, so
 * every route is open. Session state is a mock role cookie (see
 * lib/mock-server/session.ts) read by each layout's own guard, not enforced
 * here.
 */
import { NextResponse, type NextRequest } from "next/server";

export default function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/v1/:path*", "/org/:path*", "/innovation-specialist/:path*", "/innovator/:path*"],
};
