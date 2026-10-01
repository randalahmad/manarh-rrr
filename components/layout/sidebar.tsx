"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-config";

/**
 * New mark (redesigned per user request): a self-contained badge with its
 * own fixed background — unlike the old logo (raw SVG shapes sitting
 * directly on the sidebar's dark panel), this reads correctly regardless
 * of the sidebar's own surface color, which now follows the light/dark
 * toggle instead of staying a fixed brand green (see Sidebar below).
 */
function BeaconMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "var(--color-primary)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          {/* radiating beacon rays */}
          <g stroke="var(--color-beacon)" strokeWidth="1.6" strokeLinecap="round" className="beacon-pulse">
            <path d="M12 2.5v2" />
            <path d="M7.5 4.2 8.6 6" />
            <path d="M16.5 4.2 15.4 6" />
          </g>
          {/* lighthouse tower */}
          <path d="M9.5 8 L14.5 8 L16 21 L8 21 Z" fill="#fff" />
          <path d="M10.2 8 L13.8 8 L13.3 11.5 L10.7 11.5 Z" fill="var(--color-beacon)" />
          <rect x="8.6" y="16.5" width="6.8" height="1.6" fill="var(--color-primary)" />
        </svg>
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <p className="font-display text-lg font-bold text-[var(--color-ink)]">منارة</p>
          <p className="text-[10px] text-[var(--color-ink-soft)]">إدارة الابتكار المؤسسي</p>
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

  // Surface-toned sidebar (follows the light/dark toggle like the rest of
  // the page) instead of a fixed brand-green panel — the logo badge above
  // now carries the brand color instead of the whole sidebar.
  const content = (
    <div className="flex h-full flex-col border-l border-[var(--color-border-soft)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between px-4 py-5">
        <BeaconMark collapsed={collapsed} />
        <button
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-sunken)] lg:hidden"
          aria-label="إغلاق القائمة"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={collapsed ? item.label : undefined}
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
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-border-soft)] p-2.5">
        <button
          onClick={onToggleCollapse}
          className="hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)] lg:flex"
        >
          <ChevronsRight size={18} className={cn("transition-transform", collapsed && "rotate-180")} />
          {!collapsed && "طي القائمة"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 transition-[width] duration-200 lg:block",
          collapsed ? "w-[76px]" : "w-[252px]"
        )}
      >
        {content}
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-40 lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")}>
        <div
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
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
