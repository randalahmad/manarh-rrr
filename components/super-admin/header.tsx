"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, ChevronDown, User, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/layout-bits";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSessionUser } from "@/lib/client/use-session-user";
import { signOutAction } from "@/lib/server/actions/auth";

export function SuperAdminHeader({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const router = useRouter();
  const { sessionUser } = useSessionUser();
  const displayName = sessionUser?.name || sessionUser?.email || "";
  const displayEmail = sessionUser?.email ?? "";
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

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--color-border-soft)] bg-[var(--color-surface)]/90 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onOpenMobileMenu}
        className="rounded-lg p-2 text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-sunken)] lg:hidden"
        aria-label="فتح القائمة"
      >
        <Menu size={20} />
      </button>

      <div className="mr-auto flex items-center gap-1.5">
        <ThemeToggle className="text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-sunken)]" />
        <div className="relative" ref={ref}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full py-1 pl-2 pr-1 hover:bg-[var(--color-surface-sunken)]"
          >
            <Avatar name={displayName} size={32} />
            <span className="hidden text-right sm:block">
              <span className="block text-xs font-semibold text-[var(--color-ink)]">{displayName}</span>
              <span className="block text-[10px] text-[var(--color-ink-soft)]">مسؤول المنصة</span>
            </span>
            <ChevronDown size={14} className="hidden text-[var(--color-ink-soft)] sm:block" />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-11 z-30 w-56 overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-[var(--shadow-popover)]">
              <div className="border-b border-[var(--color-border-soft)] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--color-ink)]">{displayName}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{displayEmail}</p>
              </div>
              <Link
                href="/super-admin/profile"
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
