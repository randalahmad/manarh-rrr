import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ispec-ink">{title}</h1>
      {description && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-ispec-ink-soft">{description}</p>}
    </div>
    {actions}
  </div>;
}
