import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-inv-card border border-dashed border-inv-ink-200 px-6 py-12 text-center">
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-inv-brand-50 text-inv-brand-700">
          <Icon className="size-6" aria-hidden="true" />
        </div>
      )}
      <div>
        <p className="font-inv-display text-base font-bold text-inv-ink-900">{title}</p>
        {description && <p className="mt-1 text-sm text-inv-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
