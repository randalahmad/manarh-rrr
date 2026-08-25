import type { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@innovator/utils/cn';

export type AlertTone = 'success' | 'danger' | 'info';

const toneConfig: Record<AlertTone, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: 'bg-inv-status-success-bg text-inv-status-success-fg' },
  danger: { icon: AlertCircle, className: 'bg-inv-status-danger-bg text-inv-status-danger-fg' },
  info: { icon: Info, className: 'bg-inv-status-info-bg text-inv-status-info-fg' },
};

export interface AlertProps {
  tone: AlertTone;
  children: ReactNode;
  className?: string;
}

/** Inline banner for form-level feedback (e.g. login failure, reset email sent). */
export function Alert({ tone, children, className }: AlertProps) {
  const { icon: Icon, className: toneClassName } = toneConfig[tone];

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-inv-control px-3.5 py-3 text-sm', toneClassName, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
