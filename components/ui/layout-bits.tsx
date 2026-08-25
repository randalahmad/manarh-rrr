import React from "react";
import Link from "next/link";
import { ChevronLeft, Inbox, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]",
        padded && "p-5 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="مسار التصفح" className="flex items-center gap-1.5 text-xs text-[var(--color-ink-soft)]">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronLeft size={13} className="opacity-50" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-[var(--color-primary)] hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--color-ink)]">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {breadcrumbs && <div className="mb-2">
          <Breadcrumbs items={breadcrumbs} />
        </div>}
        <h1 className="font-display text-2xl font-bold text-[var(--color-ink)] sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-[var(--color-ink-soft)]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-sunken)]/40 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon size={22} />
      </div>
      <div>
        <p className="font-medium text-[var(--color-ink)]">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-[var(--color-ink-soft)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ label = "جارٍ التحميل..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--color-ink-soft)]">
      <Loader2 size={18} className="animate-spin" />
      {label}
    </div>
  );
}

export function Avatar({ name, size = 36, imgUrl }: { name: string; size?: number; imgUrl?: string }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-primary)] font-display font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {imgUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imgUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  hint,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "primary" | "beacon" | "success" | "warning" | "danger" | "info" | "neutral";
  hint?: string;
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
    beacon: "bg-[var(--color-beacon-soft)] text-[var(--color-beacon-dark)]",
    success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
    warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
    danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
    info: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
    neutral: "bg-[var(--color-neutral-soft)] text-[var(--color-ink-soft)]",
  };
  return (
    <Card className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-[var(--color-ink-soft)]">{label}</p>
        <p className="font-mono-num mt-2 text-3xl font-bold text-[var(--color-ink)]">{value}</p>
        {hint && <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{hint}</p>}
      </div>
      {Icon && (
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", toneMap[tone])}>
          <Icon size={19} />
        </span>
      )}
    </Card>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] px-1 pt-4 text-sm">
      <p className="text-[var(--color-ink-soft)]">
        صفحة <span className="font-mono-num font-medium text-[var(--color-ink)]">{page}</span> من{" "}
        <span className="font-mono-num font-medium text-[var(--color-ink)]">{totalPages}</span>
      </p>
      <div className="flex gap-1.5">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-[var(--color-surface-sunken)]"
        >
          السابق
        </button>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-[var(--color-surface-sunken)]"
        >
          التالي
        </button>
      </div>
    </div>
  );
}
