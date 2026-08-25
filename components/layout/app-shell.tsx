"use client";

import React, { useState } from "react";
import { AppDataProvider } from "@/lib/store";
import { ToastProvider } from "../ui/toast";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AppDataProvider>
      <ToastProvider>
        <div className="flex min-h-screen bg-[var(--color-canvas)]">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
          />
          <div className="min-w-0 flex-1">
            <Header onOpenMobileMenu={() => setMobileOpen(true)} />
            <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </AppDataProvider>
  );
}
