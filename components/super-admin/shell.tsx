"use client";

/**
 * Minimal, isolated shell for app/super-admin/** — deliberately NOT
 * components/layout/app-shell.tsx (which pulls in AppDataProvider, the
 * mock store used by the three existing interfaces, plus their own
 * Sidebar/Header). Functional and minimal per the approved scope ("Keep
 * the UI functional and minimal. Do not spend time on visual polishing.").
 */
import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { ToastProvider } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/server/actions/auth";

const NAV_ITEMS = [
  { href: "/super-admin", label: "لوحة التحكم" },
  { href: "/super-admin/organizations", label: "المؤسسات" },
  { href: "/super-admin/audit", label: "سجل النشاط" },
  { href: "/super-admin/profile", label: "الملف الشخصي" },
];

function SuperAdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => (href === "/super-admin" ? pathname === href : pathname.startsWith(href));

  return (
    <header className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-5">
          <span className="font-display text-base font-bold text-[var(--color-ink)]">منارة · مسؤول المنصة</span>
          <nav className="flex flex-wrap items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                    : "text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-sunken)]"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <button
          onClick={async () => {
            await signOutAction();
            router.push("/login");
            router.refresh();
          }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-danger)]"
        >
          <LogOut size={14} />
          تسجيل الخروج
        </button>
      </div>
    </header>
  );
}

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-[var(--color-canvas)]">
        <SuperAdminNav />
        <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">{children}</main>
      </div>
    </ToastProvider>
  );
}
