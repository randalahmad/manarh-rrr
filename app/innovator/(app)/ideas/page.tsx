"use client";
import { Suspense } from "react";
import { MyIdeasPage } from "@innovator/pages/innovator/MyIdeasPage";

// useIdeaListQuery() (used by this page) reads/writes the URL's search
// params, which Next.js requires to be wrapped in Suspense for prerendering.
export default function Page() {
  return (
    <Suspense>
      <MyIdeasPage />
    </Suspense>
  );
}
