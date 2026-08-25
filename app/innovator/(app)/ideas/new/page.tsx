"use client";
import { Suspense } from "react";
import { SubmitIdeaPage } from "@innovator/pages/innovator/SubmitIdeaPage";

// SubmitIdeaPage reads the ?organizationId= search param, which Next.js
// requires to be wrapped in Suspense for prerendering.
export default function Page() {
  return (
    <Suspense>
      <SubmitIdeaPage />
    </Suspense>
  );
}
