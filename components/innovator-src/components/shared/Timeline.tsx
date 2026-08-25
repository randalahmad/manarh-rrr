import type { ReactNode } from 'react';
import { cn } from '@innovator/utils/cn';

export interface TimelineEntry {
  id: string;
  title: ReactNode;
  timestamp: string;
  description?: ReactNode;
  toneClassName?: string;
}

export interface TimelineProps {
  entries: TimelineEntry[];
}

/**
 * Generic vertical timeline. The connecting line uses the beacon accent —
 * the one deliberate nod to "منارة" (a guiding light through the stages)
 * kept restrained to this single structural element.
 */
export function Timeline({ entries }: TimelineProps) {
  if (entries.length === 0) return null;

  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => (
        <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
          {index < entries.length - 1 && (
            <span className="absolute top-3 bottom-0 start-[7px] w-px bg-inv-beacon-100" aria-hidden="true" />
          )}
          <span
            className={cn(
              'relative z-10 mt-1.5 size-4 shrink-0 rounded-full border-2 border-inv-surface',
              entry.toneClassName ?? 'bg-inv-beacon-500 ring-1 ring-inv-beacon-500',
            )}
            aria-hidden="true"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-medium text-inv-ink-900">{entry.title}</p>
              <time className="text-xs text-inv-ink-500">{entry.timestamp}</time>
            </div>
            {entry.description && <p className="mt-1 text-sm text-inv-ink-500">{entry.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
