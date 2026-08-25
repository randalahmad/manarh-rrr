import React from "react";
import type { IdeaStatus } from "@/lib/types";
import { IDEA_LIFECYCLE_ORDER } from "@/lib/types";
import { IDEA_STATUS_LABELS, IDEA_STATUS_TONE, cn } from "@/lib/utils";

const toneBar: Record<string, string> = {
  neutral: "bg-[var(--color-neutral)]",
  info: "bg-[var(--color-info)]",
  warning: "bg-[var(--color-warning)]",
  success: "bg-[var(--color-success)]",
  danger: "bg-[var(--color-danger)]",
};

export function IdeaLifecycleOverview({ counts }: { counts: Map<IdeaStatus, number> }) {
  const max = Math.max(1, ...Array.from(counts.values()));
  return (
    <div className="space-y-2.5">
      {IDEA_LIFECYCLE_ORDER.map((status) => {
        const count = counts.get(status) ?? 0;
        const tone = IDEA_STATUS_TONE[status];
        return (
          <div key={status} className="flex items-center gap-3">
            <p className="w-[168px] shrink-0 truncate text-xs text-[var(--color-ink-soft)]">{IDEA_STATUS_LABELS[status]}</p>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
              <div
                className={cn("h-full rounded-full transition-all", toneBar[tone])}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <p className="font-mono-num w-6 shrink-0 text-left text-xs font-semibold text-[var(--color-ink)]">{count}</p>
          </div>
        );
      })}
    </div>
  );
}
