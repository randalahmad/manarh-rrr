import React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "info" | "warning" | "success" | "danger" | "primary" | "beacon";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-[var(--color-neutral-soft)] text-[var(--color-ink-soft)]",
  info: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
  primary: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
  beacon: "bg-[var(--color-beacon-soft)] text-[var(--color-beacon-dark)]",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  dot = false,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none",
        toneClasses[tone],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            tone === "success" && "bg-[var(--color-success)]",
            tone === "warning" && "bg-[var(--color-warning)]",
            tone === "danger" && "bg-[var(--color-danger)]",
            tone === "info" && "bg-[var(--color-info)]",
            tone === "neutral" && "bg-[var(--color-neutral)]",
            tone === "primary" && "bg-[var(--color-primary)]",
            tone === "beacon" && "bg-[var(--color-beacon)]"
          )}
        />
      )}
      {children}
    </span>
  );
}

export function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}
