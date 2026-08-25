import type { Metadata } from "next";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";
import { AppQueryProvider } from "@innovator/app/providers/QueryProvider";
import { AuthProvider } from "@innovator/app/providers/AuthContext";

export const metadata: Metadata = {
  title: "منارة | لوحة المبتكر",
};

// AppQueryProvider/AuthProvider are themselves "use client" — a Server
// Component layout can render Client Component providers directly, so this
// file doesn't need its own "use client" and can export page metadata.
//
// `.inv-scope` (see app/innovator/theme.css) carries this section's
// original body-level reset (background/font/focus-visible), scoped so it
// never leaks into the Organization Admin or Innovation Specialist
// sections that now share the same root layout/body.
export default function InnovatorRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppQueryProvider>
      <AuthProvider>
        <div className="inv-scope">{children}</div>
      </AuthProvider>
    </AppQueryProvider>
  );
}
