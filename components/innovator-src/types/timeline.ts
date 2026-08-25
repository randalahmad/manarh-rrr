import type { StatusTone } from './status';

/** Deliberately a subset of StatusTone (no "neutral") — every timeline event is expected to carry a clear signal. */
export type TimelineEventSeverity = 'info' | 'success' | 'warning' | 'danger';

export interface TimelineEventViewModel {
  id: string;
  /**
   * Domain-specific event type as a plain string (e.g. 'STATUS_CHANGE' for
   * ideas, 'UPDATE_POSTED' for projects). Deliberately not a shared closed
   * union — each domain's activity service defines its own event-type
   * union internally and widens to `string` here, so neither domain needs
   * to know the other's event vocabulary.
   */
  type: string;
  title: string;
  description?: string;
  /** ISO — used for sorting. */
  timestamp: string;
  timestampLabel: string;
  /** String key, not a component reference — resolved to an actual icon inside ActivityTimeline, keeping this file (and every activity service) free of any UI-library import. */
  icon: string;
  severity: TimelineEventSeverity;
}

/** Shared StatusTone → TimelineEventSeverity mapping, so the "no neutral" rule lives in exactly one place regardless of which domain's activity service is calling it. */
export function toTimelineSeverity(tone: StatusTone): TimelineEventSeverity {
  return tone === 'neutral' ? 'info' : tone;
}
