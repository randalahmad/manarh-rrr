import { redirect } from "next/navigation";

// There is now exactly one login form (app/login/page.tsx), shared across
// every role. This route still exists because
// app/innovation-specialist/(dashboard)/layout.tsx redirects unauthenticated
// visitors here — it now just bounces them to the shared form. After
// signing in, resolveMyHomeRouteAction() sends an INNOVATION_SPECIALIST back
// to /innovation-specialist/dashboard exactly as before.
export default function Page() {
  redirect("/login");
}
