import type { ReactNode } from 'react';
import { cn } from '@innovator/utils/cn';
import type { StatusTone } from '@innovator/types/status';

export type BadgeTone = StatusTone;

const toneStyles: Record<BadgeTone, string> = {
  success: 'bg-inv-status-success-bg text-inv-status-success-fg',
  warning: 'bg-inv-status-warning-bg text-inv-status-warning-fg',
  danger: 'bg-inv-status-danger-bg text-inv-status-danger-fg',
  info: 'bg-inv-status-info-bg text-inv-status-info-fg',
  neutral: 'bg-inv-status-neutral-bg text-inv-status-neutral-fg',
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
