import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null,
  );
}

/**
 * Implements the three behaviors a WAI-ARIA dialog (modal or drawer) needs:
 *  1. Moves focus into the container when it opens.
 *  2. Traps Tab/Shift+Tab so focus cycles within the container instead of
 *     escaping into the (visually hidden-behind-overlay) page content.
 *  3. Restores focus to whatever was focused before the dialog opened,
 *     once it closes.
 *
 * Shared by `Modal` and `Drawer` — neither reimplements this independently.
 *
 * IMPORTANT: don't put a native `autoFocus` attribute on anything rendered
 * inside dialog content. The browser applies native autofocus synchronously
 * while the DOM is being inserted — before this hook's effect runs — so it
 * would already have moved focus onto that field by the time this hook
 * tries to capture "whatever was focused before the dialog opened",
 * capturing the dialog's own field instead of the real trigger element and
 * breaking restoration on close. This hook already owns initial-focus
 * assignment (step 1 above); nothing inside dialog content needs its own.
 */
export function useFocusTrap(isOpen: boolean, containerRef: RefObject<HTMLElement | null>) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Deferred so the dialog's own content has mounted before we query it.
    const focusTimeout = window.setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const [first] = getFocusableElements(container);
      (first ?? container).focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [isOpen, containerRef]);
}
