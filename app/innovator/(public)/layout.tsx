"use client";

import { PublicLayout } from "@innovator/layouts/PublicLayout";
import { OutletProvider } from "@innovator/_compat/react-router-shim";

// PublicLayout still renders <Outlet /> internally (unchanged from the
// original source).
export default function PublicGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <OutletProvider value={children}>
      <PublicLayout />
    </OutletProvider>
  );
}
