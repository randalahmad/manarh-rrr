import type { ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';

export interface FilterBarProps {
  children: ReactNode;
  onReset?: () => void;
  hasActiveFilters?: boolean;
}

/** Generic layout wrapper for a row of filter controls (selects, etc.) passed in as children. */
export function FilterBar({ children, onReset, hasActiveFilters }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-inv-card border border-inv-ink-100 bg-inv-surface p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex items-center gap-2 text-sm font-medium text-inv-ink-700">
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        <span>تصفية</span>
      </div>
      <div className="flex flex-col gap-3 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>
      {hasActiveFilters && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="self-start text-sm font-medium text-inv-brand-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700 sm:self-auto"
        >
          إعادة تعيين
        </button>
      )}
    </div>
  );
}
