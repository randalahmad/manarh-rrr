"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  defaultTab,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  defaultTab?: string;
  onChange?: (id: string) => void;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);

  const select = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border-soft)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => select(tab.id)}
          className={cn(
            "relative shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors",
            active === tab.id ? "text-[var(--color-primary)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          )}
        >
          {tab.label}
          {typeof tab.count === "number" && (
            <span className="mr-1.5 rounded-full bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[10px] font-mono-num">
              {tab.count}
            </span>
          )}
          {active === tab.id && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--color-beacon)]" />
          )}
        </button>
      ))}
    </div>
  );
}

export function useTabState(defaultTab: string) {
  return useState(defaultTab);
}
