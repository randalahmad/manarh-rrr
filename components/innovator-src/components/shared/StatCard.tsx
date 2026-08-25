import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@innovator/utils/cn';
import { SkeletonBlock } from './LoadingState';

export interface StatCardTrend {
  direction: 'up' | 'down';
  label: string;
}

export interface StatCardProps {
  title: string;
  value: number | string;
  icon?: LucideIcon;
  description?: string;
  tone?: 'brand' | 'beacon' | 'neutral';
  trend?: StatCardTrend;
  /** When true, renders a skeleton placeholder instead of value/description — callers don't need to build their own loading markup per card. */
  isLoading?: boolean;
  /** Reserved for future drill-down (e.g. clicking "تحتاج استكمال" filters My Ideas). */
  onClick?: () => void;
}

const toneStyles = {
  brand: 'bg-inv-brand-50 text-inv-brand-800',
  beacon: 'bg-inv-beacon-50 text-inv-beacon-700',
  neutral: 'bg-inv-ink-50 text-inv-ink-700',
};

export function StatCard({ title, value, icon: Icon, description, tone = 'neutral', trend, isLoading, onClick }: StatCardProps) {
  const isInteractive = Boolean(onClick) && !isLoading;
  const Wrapper = isInteractive ? 'button' : 'div';
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown;

  return (
    <Wrapper
      onClick={isInteractive ? onClick : undefined}
      type={isInteractive ? 'button' : undefined}
      aria-label={isInteractive ? `${title}: ${value}` : undefined}
      className={cn(
        'flex items-center gap-4 rounded-inv-card border border-inv-ink-100 bg-inv-surface p-4 text-start',
        isInteractive &&
          'transition-shadow hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700',
      )}
    >
      {Icon && (
        <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-inv-control', toneStyles[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        {isLoading ? (
          <>
            <SkeletonBlock className="h-6 w-12" />
            <SkeletonBlock className="mt-2 h-4 w-20" />
          </>
        ) : (
          <>
            <p className="font-inv-display text-2xl font-bold text-inv-ink-900">{value}</p>
            <p className="text-sm text-inv-ink-500">{title}</p>
            {description && <p className="mt-0.5 text-xs text-inv-ink-300">{description}</p>}
            {trend && (
              <p
                className={cn(
                  'mt-1 flex items-center gap-1 text-xs font-medium',
                  trend.direction === 'up' ? 'text-inv-status-success-fg' : 'text-inv-status-danger-fg',
                )}
              >
                <TrendIcon className="size-3.5" aria-hidden="true" />
                {trend.label}
              </p>
            )}
          </>
        )}
      </div>
    </Wrapper>
  );
}
