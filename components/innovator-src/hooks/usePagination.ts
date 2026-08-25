import { useState } from 'react';

export interface UsePaginationOptions {
  pageSize?: number;
  /**
   * When this value changes, pagination resets to the first page.
   * Pass a string derived from whatever should restart pagination
   * (e.g. the active filters) — the hook doesn't need to know what it means.
   */
  resetKey?: string;
}

export interface UsePaginationResult<T> {
  visibleItems: T[];
  hasMore: boolean;
  totalCount: number;
  loadMore: () => void;
}

const DEFAULT_PAGE_SIZE = 9;

/**
 * Client-side "load more" pagination over an already-fetched array.
 * MyIdeasPage (and any future list page) only sees `visibleItems` /
 * `hasMore` / `loadMore` — not how pagination is implemented. Swapping this
 * for real server-side pagination later (page/cursor params on the service)
 * only means changing this hook's internals, not any page that uses it.
 */
export function usePagination<T>(items: T[], options?: UsePaginationOptions): UsePaginationResult<T> {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const [visibleCount, setVisibleCount] = useState(pageSize);

  // Reset pagination when resetKey changes. Adjusted synchronously during
  // render (React's documented pattern for "reset state when a prop
  // changes") using state instead of a ref, which the lint rule
  // react-hooks/refs flags because reading/writing ref.current during
  // render is unsafe under concurrent rendering. Behavior is unchanged.
  const [lastResetKey, setLastResetKey] = useState(options?.resetKey);
  if (options?.resetKey !== undefined && options.resetKey !== lastResetKey) {
    setLastResetKey(options.resetKey);
    setVisibleCount(pageSize);
  }

  return {
    visibleItems: items.slice(0, visibleCount),
    hasMore: visibleCount < items.length,
    totalCount: items.length,
    loadMore: () => setVisibleCount((count) => count + pageSize),
  };
}
