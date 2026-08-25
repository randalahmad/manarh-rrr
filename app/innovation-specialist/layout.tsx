import type { Metadata } from "next";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";

export const metadata: Metadata = {
  title: "منارة | مسؤول الابتكار",
};

// `.ispec-scope` (see app/innovation-specialist/theme.css) carries this
// section's original body-level reset (background/font/focus-visible),
// scoped so it never leaks into the Organization Admin or Innovator
// sections that now share the same root layout/body.
//
// AppShell (Sidebar/Topbar) is intentionally NOT applied here — it only
// wraps the `(dashboard)` route group below, so /innovation-specialist/login
// renders without the authenticated nav shell (matching the original
// Repository 3 behavior where the login screen had no sidebar).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="ispec-scope">{children}</div>;
}
