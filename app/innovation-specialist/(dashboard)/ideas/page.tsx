import { IdeasClient } from "./ideas-client";

export default async function IdeasPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = "all" } = await searchParams;
  return <IdeasClient initialFilter={filter} />;
}
