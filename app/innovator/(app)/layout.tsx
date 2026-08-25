"use client";

import { Suspense } from "react";
import { InnovatorLayout } from "@innovator/layouts/InnovatorLayout";
import { OutletProvider } from "@innovator/_compat/react-router-shim";

// InnovatorLayout still renders <Outlet /> internally (unchanged from the
// original source) and performs the same session-guard redirect to
// /innovator/login it always did.
//
// Suspense wraps the OutletProvider (rather than each individual page)
// because Next.js's useSearchParams()-prerendering bailout does not
// propagate correctly through the Outlet-via-context indirection used here
// — verified empirically. This still gives every route under this group
// the same "de-opt to client rendering" behavior the pages that actually
// read search params need.
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <OutletProvider value={children}>
        <InnovatorLayout />
      </OutletProvider>
    </Suspense>
  );
}
