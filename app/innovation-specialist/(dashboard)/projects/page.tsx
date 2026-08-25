import { ProjectsClient } from "./projects-client";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = "all" } = await searchParams;
  return <ProjectsClient initialFilter={filter} />;
}
