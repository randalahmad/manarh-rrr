import { useEffect, type RefObject } from 'react';
import { useLocation } from '@innovator/_compat/react-router-shim';

/**
 * React Router doesn't reload the page on navigation, so the browser never
 * fires its native focus-reset behavior. Without this, a screen reader user
 * clicking a nav link hears nothing change, and a keyboard user's focus
 * stays on the link they just activated instead of moving into the new
 * page. Call once per layout that owns a `<main>` landmark.
 */
export function useFocusMainOnNavigate(mainRef: RefObject<HTMLElement | null>) {
  const location = useLocation();

  useEffect(() => {
    mainRef.current?.focus();
  }, [location.pathname, mainRef]);
}
