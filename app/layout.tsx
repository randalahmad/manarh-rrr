import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "منارة | مسؤول الجهة",
  description: "منصة منارة لإدارة وحوكمة دورة حياة الابتكار المؤسسي",
};

// One platform-wide light/dark toggle (data-theme on <html>) driving all
// three token namespaces (app/globals.css, app/innovation-specialist/theme.css,
// app/innovator/theme.css) at once — see the theme rollout plan. The public
// landing/login/forgot-password pages intentionally opt out (their own
// permanently-dark inline palette, unaffected by this).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
