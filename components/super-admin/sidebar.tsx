"use client";

/**
 * Super Admin's own sidebar — visually consistent with
 * components/layout/sidebar.tsx (same surface-toned panel that follows the
 * light/dark toggle, same new logo badge, icons, active-state indicator)
 * but a separate, isolated component with its own nav items, per shell.tsx's
 * existing isolation rationale (no shared state with the org-admin/
 * specialist mock-store-backed shell).
 */
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, ScrollText, UserRound, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/super-admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/super-admin/organizations", label: "المؤسسات", icon: Building2 },
  { href: "/super-admin/audit", label: "سجل النشاط", icon: ScrollText },
  { href: "/super-admin/profile", label: "الملف الشخصي", icon: UserRound },
];

function BeaconMark() {
  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "var(--color-primary)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <g stroke="var(--color-beacon)" strokeWidth="1.6" strokeLinecap="round" className="beacon-pulse">
            <path d="M12 2.5v2" />
            <path d="M7.5 4.2 8.6 6" />
            <path d="M16.5 4.2 15.4 6" />
          </g>
          <path d="M9.5 8 L14.5 8 L16 21 L8 21 Z" fill="#fff" />
          <path d="M10.2 8 L13.8 8 L13.3 11.5 L10.7 11.5 Z" fill="var(--color-beacon)" />
          <rect x="8.6" y="16.5" width="6.8" height="1.6" fill="var(--color-primary)" />
        </svg>
      </div>
      <div className="leading-tight">
        <p className="font-display text-base font-bold text-[var(--color-ink)]">منارة</p>
        <p className="text-[10px] text-[var(--color-ink-soft)]">مسؤول المنصة</p>
      </div>
    </div>
  );
}

export function SuperAdminSidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

  const content = (
    <div className="flex h-full flex-col border-l border-[var(--color-border-soft)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between px-4 py-5">
        <BeaconMark />
        <button
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-sunken)] lg:hidden"
          aria-label="إغلاق القائمة"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 px-2.5 pb-4">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/super-admin" ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                  : "text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]"
              )}
            >
              {active && (
                <span className="absolute right-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[var(--color-beacon)]" />
              )}
              <Icon size={19} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 lg:block">{content}</aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-40 lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")}>
        <div
          className={cn("absolute inset-0 bg-black/40 transition-opacity", mobileOpen ? "opacity-100" : "opacity-0")}
          onClick={onCloseMobile}
        />
        <div
          className={cn(
            "absolute top-0 right-0 h-full w-[260px] shadow-2xl transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          {content}
        </div>
      </div>
    </>
  );
}
