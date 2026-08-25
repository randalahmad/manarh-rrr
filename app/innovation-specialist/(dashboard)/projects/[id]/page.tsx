import { ProjectDetailsClient } from "./project-details-client";

// Phase 6, Group D: the existence check used to be a mock-array lookup
// against the static `assignedProjects` list (always false for a real
// project id, which would 404 every real project). Existence + RBAC are
// now enforced for real by getProjectAction/getProjectById server-side —
// ProjectDetailsClient's own error state handles "not found" once the
// fetch resolves.
export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetailsClient id={id} />;
}
