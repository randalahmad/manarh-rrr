"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

/** True only after client hydration — avoids a server/client mismatch on the
 * theme icon (the server can't know the stored/system preference) without
 * an effect-driven setState. */
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

/**
 * Platform-wide light/dark toggle — flips the single data-theme attribute
 * on <html> (see app/layout.tsx's ThemeProvider), which every token
 * namespace (app/globals.css, app/innovation-specialist/theme.css,
 * app/innovator/theme.css) reads from. Reused as-is across every
 * interface's header; only the wrapping button's className varies per
 * section's own visual language at the call site.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useIsClient();

  if (!isClient) {
    return <span className={cn("inline-block h-9 w-9", className)} aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "التبديل للوضع الفاتح" : "التبديل للوضع الداكن"}
      title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        className
      )}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
