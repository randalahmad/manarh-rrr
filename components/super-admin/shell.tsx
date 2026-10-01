"use client";

/**
 * Shell for app/super-admin/** — deliberately NOT
 * components/layout/app-shell.tsx (which pulls in AppDataProvider, the
 * mock store used by the three existing interfaces, plus their own
 * Sidebar/Header). Uses this interface's OWN sidebar/header
 * (components/super-admin/sidebar.tsx, header.tsx), visually consistent
 * with the org-admin shell's sidebar+header layout language, but with no
 * shared state/data source between the two.
 */
import React, { useState } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { SuperAdminSidebar } from "./sidebar";
import { SuperAdminHeader } from "./header";

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[var(--color-canvas)]">
        <SuperAdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        <div className="min-w-0 flex-1">
          <SuperAdminHeader onOpenMobileMenu={() => setMobileOpen(true)} />
          <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
