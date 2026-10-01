import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * LifecyclePath — the platform's signature element.
 * منارة (a lighthouse/beacon) guiding an idea or project through its stages:
 * completed stops glow solid amber, the current stop pulses, upcoming stops
 * stay hollow. Reused on the dashboard lifecycle overview, idea detail, and
 * project detail pages so the metaphor stays consistent everywhere.
 */
export function LifecyclePath({
  steps,
  activeIndex,
  isTerminalOffPath = false,
}: {
  steps: string[];
  activeIndex: number;
  /** true when the current status is an off-ramp (e.g. withdrawn/not pursued) rather than forward progress */
  isTerminalOffPath?: boolean;
}) {
  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex min-w-max items-center">
        {steps.map((label, i) => {
          const isDone = i < activeIndex;
          const isCurrent = i === activeIndex;
          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-2 px-1.5" style={{ width: 118 }}>
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                    isDone && "border-[var(--color-beacon)] bg-[var(--color-beacon)] text-[var(--color-primary-dark)]",
                    isCurrent &&
                      !isTerminalOffPath &&
                      "border-[var(--color-beacon)] bg-[var(--color-beacon-soft)] text-[var(--color-beacon-dark)] beacon-pulse",
                    isCurrent && isTerminalOffPath && "border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
                    !isDone && !isCurrent && "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-soft)]/50"
                  )}
                >
                  {isDone ? <Check size={15} /> : <span className="font-mono-num text-xs">{i + 1}</span>}
                </div>
                <p
                  className={cn(
                    "text-center text-[11px] leading-tight",
                    (isDone || isCurrent) ? "font-medium text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]/70"
                  )}
                >
                  {label}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "-mt-5 h-0.5 min-w-[24px] flex-1 rounded-full",
                    i < activeIndex ? "bg-[var(--color-beacon)]" : "bg-[var(--color-border)]"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  const toneDot: Record<string, string> = {
    neutral: "bg-[var(--color-neutral)]",
    success: "bg-[var(--color-success)]",
    warning: "bg-[var(--color-warning)]",
    danger: "bg-[var(--color-danger)]",
    info: "bg-[var(--color-info)]",
  };
  return (
    <ol className="relative border-r-2 border-[var(--color-border-soft)] pr-5">
      {events.map((ev, i) => (
        <li key={ev.id} className={cn("relative", i !== events.length - 1 && "pb-6")}>
          <span
            className={cn(
              "absolute top-1 right-[-27px] h-3 w-3 rounded-full ring-4 ring-[var(--color-surface)]",
              toneDot[ev.tone ?? "neutral"]
            )}
          />
          <p className="text-sm font-medium text-[var(--color-ink)]">{ev.title}</p>
          {ev.description && <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">{ev.description}</p>}
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]/70">{ev.timestamp}</p>
        </li>
      ))}
    </ol>
  );
}
