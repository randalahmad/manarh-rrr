import { useParams } from '@innovator/_compat/react-router-shim';
import { useProjectDetails } from '@innovator/features/projects/hooks/useProjectDetails';

import { ProjectDetailsHeader } from '@innovator/features/projects/components/project-details/ProjectDetailsHeader';
import { ProjectProgressSection } from '@innovator/features/projects/components/project-details/ProjectProgressSection';
import { ProjectRequirementsList } from '@innovator/features/projects/components/project-details/ProjectRequirementsList';
import { ProjectDeliveryTimeline } from '@innovator/features/projects/components/project-details/ProjectDeliveryTimeline';
import { ProjectStakeholdersList } from '@innovator/features/projects/components/project-details/ProjectStakeholdersList';

import { AttachmentsList } from '@innovator/components/shared/AttachmentsList';
import { ActivityTimeline } from '@innovator/components/shared/ActivityTimeline';
import { LoadingState } from '@innovator/components/shared/LoadingState';
import { ErrorState } from '@innovator/components/shared/ErrorState';

export function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const detailsQuery = useProjectDetails(id);
  const project = detailsQuery.data;

  if (detailsQuery.isLoading) {
    return <LoadingState label="جاري تحميل تفاصيل المشروع..." />;
  }

  if (detailsQuery.isError || !project) {
    return <ErrorState onRetry={() => detailsQuery.refetch()} />;
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <ProjectDetailsHeader project={project} />

      <ProjectProgressSection project={project} />
      <ProjectRequirementsList requirements={project.requirements} />
      <ProjectDeliveryTimeline milestones={project.deliveryMilestones} />
      <AttachmentsList attachments={project.attachments} emptyTitle="لا توجد مرفقات لهذا المشروع" />

      <div>
        <h2 className="mb-4 font-inv-display font-bold text-inv-ink-900">آخر التحديثات</h2>
        <ActivityTimeline events={project.timeline} emptyTitle="لا توجد تحديثات بعد" />
      </div>

      <ProjectStakeholdersList stakeholders={project.stakeholders} />
    </div>
  );
}
