import type { ReactNode } from 'react';

export interface ListToolbarProps {
  /** Primary control, e.g. a search input. Grows to fill available space. */
  leftSlot?: ReactNode;
  /** Secondary controls aligned opposite `leftSlot`, e.g. a sort select or an "add" button. */
  rightSlot?: ReactNode;
  /** Rendered on its own row below — e.g. a filter bar. Optional so callers without filters don't get empty spacing. */
  actionsSlot?: ReactNode;
}

/**
 * Generic list-page toolbar layout. Has no knowledge of what's being
 * searched/filtered/sorted, or even that it's for ideas — any list module
 * (My Projects, etc.) can compose its own controls into these three slots.
 */
export function ListToolbar({ leftSlot, rightSlot, actionsSlot }: ListToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      {(leftSlot || rightSlot) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {leftSlot && <div className="flex-1">{leftSlot}</div>}
          {rightSlot && <div className="flex items-center gap-3 sm:w-56 sm:shrink-0">{rightSlot}</div>}
        </div>
      )}
      {actionsSlot}
    </div>
  );
}
