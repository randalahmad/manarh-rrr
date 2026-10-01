import { redirect } from "next/navigation";

// There is now exactly one login form (app/login/page.tsx), shared across
// every role. This route still exists because InnovatorLayout's client-side
// guard (components/innovator-src/layouts/InnovatorLayout.tsx) navigates
// unauthenticated visitors to "/innovator/login" — it now just bounces them
// to the shared form. After signing in, resolveMyHomeRouteAction() sends an
// INTERNAL_INNOVATOR/EXTERNAL_INNOVATOR to /innovator/dashboard.
export default function Page() {
  redirect("/login");
}
