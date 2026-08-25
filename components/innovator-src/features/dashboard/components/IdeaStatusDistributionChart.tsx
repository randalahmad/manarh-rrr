import type { DashboardStatusDistributionItem } from '../types';
import type { StatusTone } from '@innovator/types/status';

export interface IdeaStatusDistributionChartProps {
  items: DashboardStatusDistributionItem[];
}

/** Same tone→color mapping used by Badge/StatusBadge, applied to bar fills instead of pill backgrounds — keeps the chart visually consistent with every status badge elsewhere in the app. */
const TONE_BAR_CLASS: Record<StatusTone, string> = {
  success: 'bg-inv-status-success-fg',
  warning: 'bg-inv-status-warning-fg',
  danger: 'bg-inv-status-danger-fg',
  info: 'bg-inv-status-info-fg',
  neutral: 'bg-inv-ink-300',
};

/**
 * A simple, dependency-free proportional bar chart. Given the small number
 * of categories (at most the 12 idea statuses) and that this only needs to
 * communicate relative share — not interactive tooltips, zooming, or
 * multi-series comparison — a full charting library would be more weight
 * than the visualization needs. Every bar's width and label come directly
 * from `items`, which the page/service already computed from the real
 * ideas list; this component performs no calculation of its own.
 */
export function IdeaStatusDistributionChart({ items }: IdeaStatusDistributionChartProps) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.status} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm text-inv-ink-700 sm:w-40">{item.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-inv-ink-100">
            <div
              className={`h-full rounded-full ${TONE_BAR_CLASS[item.tone]}`}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-end text-sm text-inv-ink-500">
            {item.count} ({item.percentage}٪)
          </span>
        </div>
      ))}
    </div>
  );
}
