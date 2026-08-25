import { FolderKanban } from 'lucide-react';
import { useProjects } from '@innovator/features/projects/hooks/useProjects';
import { ProjectsList } from '@innovator/features/projects/components/ProjectsList';
import { PageHeader } from '@innovator/components/shared/PageHeader';
import { EmptyState } from '@innovator/components/shared/EmptyState';
import { LoadingState } from '@innovator/components/shared/LoadingState';
import { ErrorState } from '@innovator/components/shared/ErrorState';

export function MyProjectsPage() {
  const projectsQuery = useProjects();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="مشاريعي" description="المشاريع الناتجة عن أفكارك المعتمدة." />

      {projectsQuery.isLoading ? (
        <LoadingState label="جاري تحميل المشاريع..." />
      ) : projectsQuery.isError ? (
        <ErrorState onRetry={() => projectsQuery.refetch()} />
      ) : (projectsQuery.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="لا توجد مشاريع بعد"
          description="تظهر هنا المشاريع الناتجة عن أفكارك المعتمدة."
        />
      ) : (
        <ProjectsList projects={projectsQuery.data!} />
      )}
    </div>
  );
}
