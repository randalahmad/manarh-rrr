"use client";

import { AuthLayout } from "@innovator/layouts/AuthLayout";
import { OutletProvider } from "@innovator/_compat/react-router-shim";

// AuthLayout still renders <Outlet /> internally (unchanged from the
// original source) — OutletProvider supplies this segment's `children` to
// it through context, standing in for react-router's route matching.
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <OutletProvider value={children}>
      <AuthLayout />
    </OutletProvider>
  );
}
