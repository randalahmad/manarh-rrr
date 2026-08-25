"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-config";

function BeaconMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none" className="shrink-0">
        <path d="M20 3 L31 12 V33 H9 V12 Z" fill="var(--color-primary-light)" />
        <path d="M20 3 L31 12 H9 Z" fill="var(--color-beacon)" />
        <rect x="16" y="18" width="8" height="15" fill="var(--color-primary-dark)" />
        <circle cx="20" cy="10" r="2.4" fill="#fff" className="beacon-pulse" />
      </svg>
      {!collapsed && (
        <div className="leading-tight">
          <p className="font-display text-lg font-bold text-white">منارة</p>
          <p className="text-[10px] text-white/60">إدارة الابتكار المؤسسي</p>
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

  const content = (
    <div className="flex h-full flex-col bg-[var(--color-primary)]">
      <div className="flex items-center justify-between px-4 py-5">
        <BeaconMark collapsed={collapsed} />
        <button
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 lg:hidden"
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
                active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
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

      <div className="border-t border-white/10 p-2.5">
        <button
          onClick={onToggleCollapse}
          className="hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white lg:flex"
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
