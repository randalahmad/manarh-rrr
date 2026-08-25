import type { ReactNode } from 'react';
import { cn } from '@innovator/utils/cn';

export interface DashboardGridProps {
  children: ReactNode;
  /** Max columns at the widest breakpoint — grid degrades gracefully on smaller screens. */
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

const columnStyles: Record<NonNullable<DashboardGridProps['columns']>, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
};

/** Generic responsive grid — used for stat cards and any other card collection that needs to reflow by breakpoint. */
export function DashboardGrid({ children, columns = 3, className }: DashboardGridProps) {
  return <div className={cn('grid gap-4', columnStyles[columns], className)}>{children}</div>;
}
