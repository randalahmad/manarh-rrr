"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ChevronDown, User, LogOut } from "lucide-react";
import { ROLE_LABELS } from "@/lib/utils";
import { Avatar } from "../ui/layout-bits";
import { NotificationBell } from "./notification-panel";
import { PAGE_TITLES } from "./nav-config";
import { signOutAction } from "@/lib/server/actions/auth";
import { useSessionUser } from "@/lib/client/use-session-user";

export function Header({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  // Demo-data cleanup (Category C.1): identity now comes from the real
  // authenticated session, not the mock store's seeded currentUser.
  const { sessionUser } = useSessionUser();
  const displayName = sessionUser?.name || sessionUser?.email || "";
  const displayEmail = sessionUser?.email ?? "";
  const displayRole = sessionUser?.role ? ROLE_LABELS[sessionUser.role] : "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const onLogout = async () => {
    setMenuOpen(false);
    setSigningOut(true);
    await signOutAction();
    router.push("/login");
    router.refresh();
  };

  const title =
    PAGE_TITLES[pathname] ??
    PAGE_TITLES[Object.keys(PAGE_TITLES).find((k) => pathname.startsWith(k)) ?? ""] ??
    "منارة";

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--color-border-soft)] bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-sunken)] lg:hidden"
          aria-label="فتح القائمة"
        >
          <Menu size={20} />
        </button>
        <h1 className="font-display text-base font-bold text-[var(--color-ink)] sm:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        <NotificationBell />
        <div className="mx-1 h-6 w-px bg-[var(--color-border-soft)]" />
        <div className="relative" ref={ref}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full py-1 pl-2 pr-1 hover:bg-[var(--color-surface-sunken)]"
          >
            <Avatar name={displayName} size={32} />
            <span className="hidden text-right sm:block">
              <span className="block text-xs font-semibold text-[var(--color-ink)]">{displayName}</span>
              <span className="block text-[10px] text-[var(--color-ink-soft)]">{displayRole}</span>
            </span>
            <ChevronDown size={14} className="hidden text-[var(--color-ink-soft)] sm:block" />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-11 z-30 w-56 overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-white shadow-[var(--shadow-popover)]">
              <div className="border-b border-[var(--color-border-soft)] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--color-ink)]">{displayName}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{displayEmail}</p>
              </div>
              <Link
                href="/org/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)]"
              >
                <User size={16} /> الملف الشخصي
              </Link>
              <button
                onClick={onLogout}
                disabled={signingOut}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] disabled:opacity-60"
              >
                <LogOut size={16} /> {signingOut ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
