"use client";

/**
 * Compatibility shim so the Innovator interface's original source (written
 * against react-router-dom v7) needed almost no logic changes when ported
 * from Vite + React Router to Next.js App Router. Every file that used to
 * import from the "react-router-dom" package now imports the same named
 * exports from this file instead — the call sites themselves are unchanged.
 *
 * This is the one deliberate, merge-required adaptation layer called out in
 * the merge plan (manarah-merge-plan.md, section 4.3) — no business logic
 * was changed, only how routing primitives are implemented underneath.
 */

import { createContext, useContext, useMemo, type ReactNode, type AnchorHTMLAttributes } from "react";
import NextLink from "next/link";
import { usePathname, useRouter, useSearchParams as useNextSearchParams } from "next/navigation";

// Re-exported as-is: Next's useParams()/useSearchParams() (read side) match
// react-router's read API closely enough that no shim is needed for reads.
export { useParams } from "next/navigation";

// ---- Link (react-router's `to` prop -> next/link's `href` prop) ----
interface CompatLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string;
  replace?: boolean;
  children?: ReactNode;
}
export function Link({ to, replace, ...rest }: CompatLinkProps) {
  return <NextLink href={to} replace={replace} {...rest} />;
}

// ---- NavLink (render-prop `className={({isActive}) => ...}` + `end`) ----
interface CompatNavLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href"> {
  to: string;
  end?: boolean;
  className?: string | ((state: { isActive: boolean }) => string);
  children?: ReactNode;
}
export function NavLink({ to, end, className, children, ...rest }: CompatNavLinkProps) {
  const pathname = usePathname();
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  const resolvedClassName = typeof className === "function" ? className({ isActive }) : className;
  return (
    <NextLink href={to} className={resolvedClassName} {...rest}>
      {children}
    </NextLink>
  );
}

// ---- Navigate (declarative redirect used inside render) ----
export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useRouter();
  if (replace) router.replace(to);
  else router.push(to);
  return null;
}

// ---- useNavigate (imperative navigate(path, { replace }) function) ----
export function useNavigate() {
  const router = useRouter();
  return (to: string, options?: { replace?: boolean }) => {
    if (options?.replace) router.replace(to);
    else router.push(to);
  };
}

// ---- useLocation (subset actually used by the ported code: pathname + state) ----
// `state` is always null: the original app never passed router state when
// navigating (grep-verified), so this matches existing behavior exactly.
// `search`/`hash` are intentionally NOT read here (grep-verified unused by
// every caller) — pulling in next/navigation's useSearchParams just to
// populate an unused field would force every caller into a Suspense
// boundary for no behavioral benefit.
export function useLocation() {
  const pathname = usePathname();
  return {
    pathname,
    search: "",
    hash: "",
    state: null as unknown,
    key: "default",
  };
}

// ---- useSearchParams (react-router's [searchParams, setSearchParams] tuple) ----
export function useSearchParams(): [URLSearchParams, (params: URLSearchParams, options?: { replace?: boolean }) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const nextSearchParams = useNextSearchParams();
  const searchParams = useMemo(() => new URLSearchParams(nextSearchParams.toString()), [nextSearchParams]);

  const setSearchParams = (params: URLSearchParams, options?: { replace?: boolean }) => {
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (options?.replace) router.replace(url);
    else router.push(url);
  };

  return [searchParams, setSearchParams];
}

// ---- Outlet (react-router renders the matched child route here) ----
// Next.js layouts receive their matched child segment as the `children`
// prop instead. OutletProvider (used by the app/innovator/**/layout.tsx
// wrapper files) puts that `children` value into context; the ported
// layout components (AuthLayout, InnovatorLayout, PublicLayout) still just
// render <Outlet /> exactly as they did before.
const OutletContext = createContext<ReactNode>(null);

export function OutletProvider({ value, children }: { value: ReactNode; children: ReactNode }) {
  return <OutletContext.Provider value={value}>{children}</OutletContext.Provider>;
}

export function Outlet() {
  return <>{useContext(OutletContext)}</>;
}
