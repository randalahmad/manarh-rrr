import { useId, type ReactNode } from 'react';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';

export interface DashboardSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  /** When true, renders LoadingState instead of children (announced via LoadingState's role="status"). */
  isLoading?: boolean;
  loadingLabel?: string;
  /** When true, renders ErrorState instead of children. */
  isError?: boolean;
  onRetry?: () => void;
  /** When true (and not loading/error), renders `emptyState` instead of children. */
  isEmpty?: boolean;
  emptyState?: ReactNode;
}

/**
 * Generic section wrapper used to compose the Dashboard (and reusable
 * anywhere else a titled block of content is needed). Sections are stacked
 * with 32px gaps by the parent (`DashboardPage` uses `gap-8`).
 *
 * Owns the loading/error/empty/success switch internally so callers don't
 * repeat the same ternary in every section — pass the query state flags in
 * and render the real content as `children` for the success case.
 */
export function DashboardSection({
  title,
  description,
  action,
  children,
  isLoading,
  loadingLabel,
  isError,
  onRetry,
  isEmpty,
  emptyState,
}: DashboardSectionProps) {
  const headingId = useId();

  let content: ReactNode;
  if (isLoading) {
    content = <LoadingState label={loadingLabel} />;
  } else if (isError) {
    content = <ErrorState onRetry={onRetry} />;
  } else if (isEmpty && emptyState) {
    content = emptyState;
  } else {
    content = children;
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id={headingId} className="font-inv-display text-lg font-bold text-inv-ink-900">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-inv-ink-500">{description}</p>}
        </div>
        {action}
      </div>
      {content}
    </section>
  );
}
