import { useState } from 'react';
import { useNavigate, useParams } from '@innovator/_compat/react-router-shim';
import { useQueryClient } from '@tanstack/react-query';
import { useIdeaDetails } from '@innovator/features/ideas/hooks/useIdeaDetails';
import { ideaWorkflow, IdeaWorkflowError } from '@innovator/features/ideas/services/ideaWorkflow';
import { getIdeaWorkflowErrorMessage } from '@innovator/features/ideas/workflowErrorMessages';
import { queryKeys } from '@innovator/constants/queryKeys';
import { useFormFeedback } from '@innovator/hooks/useFormFeedback';

import { IdeaDetailsHeader } from '@innovator/features/ideas/components/idea-details/IdeaDetailsHeader';
import { IdeaDetailsSummary } from '@innovator/features/ideas/components/idea-details/IdeaDetailsSummary';
import { IdeaInformationRequestsSection } from '@innovator/features/ideas/components/idea-details/IdeaInformationRequestsSection';
import { IdeaDecisionSection } from '@innovator/features/ideas/components/idea-details/IdeaDecisionSection';
import { IdeaRelatedProjectCard } from '@innovator/features/ideas/components/idea-details/IdeaRelatedProjectCard';
import { IdeaDetailsActions } from '@innovator/features/ideas/components/idea-details/IdeaDetailsActions';
import { WithdrawIdeaModal } from '@innovator/features/ideas/components/idea-details/WithdrawIdeaModal';

import { AttachmentsList } from '@innovator/components/shared/AttachmentsList';
import { ActivityTimeline } from '@innovator/components/shared/ActivityTimeline';
import { FormAlert } from '@innovator/components/shared/FormAlert';
import { LoadingState } from '@innovator/components/shared/LoadingState';
import { ErrorState } from '@innovator/components/shared/ErrorState';

export function IdeaDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // The page's ONLY data dependency — no ideaService/projectService/ideaActivityService calls here.
  const detailsQuery = useIdeaDetails(id);
  const idea = detailsQuery.data;

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isCompletingInformation, setIsCompletingInformation] = useState(false);
  const feedback = useFormFeedback();

  if (detailsQuery.isLoading) {
    return <LoadingState label="جاري تحميل تفاصيل الفكرة..." />;
  }

  if (detailsQuery.isError || !idea) {
    return <ErrorState onRetry={() => detailsQuery.refetch()} />;
  }

  const invalidateIdeaQueries = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.ideas.detailView(idea.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
  };

  const handleWithdraw = async (reason: string) => {
    feedback.clear();
    try {
      const result = await ideaWorkflow.withdraw({
        ideaId: idea.id,
        currentStatus: idea.statusValue,
        reason,
      });
      invalidateIdeaQueries();
      setIsWithdrawModalOpen(false);
      navigate(result.redirectTo, { replace: true });
    } catch (error) {
      feedback.setError(getIdeaWorkflowErrorMessage(error instanceof IdeaWorkflowError ? error : undefined));
    }
  };

  const handleCompleteInformation = async (requestId: string, response: string, files: File[]) => {
    setIsCompletingInformation(true);
    feedback.clear();
    try {
      const result = await ideaWorkflow.completeInformation({
        ideaId: idea.id,
        currentStatus: idea.statusValue,
        requestId,
        response,
        pendingFiles: files,
        existingAttachments: idea.attachments,
      });
      invalidateIdeaQueries();
      navigate(result.redirectTo, { replace: true });
    } catch (error) {
      feedback.setError(getIdeaWorkflowErrorMessage(error instanceof IdeaWorkflowError ? error : undefined));
    } finally {
      setIsCompletingInformation(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-4">
      <IdeaDetailsHeader idea={idea} />

      <FormAlert message={feedback.message} tone={feedback.tone} />

      <IdeaDetailsActions
        availableActions={idea.availableActions}
        onWithdrawClick={() => setIsWithdrawModalOpen(true)}
      />

      <IdeaDetailsSummary idea={idea} />
      <AttachmentsList attachments={idea.attachments} />

      <div>
        <h2 className="mb-4 font-inv-display font-bold text-inv-ink-900">سجل الحالة</h2>
        <ActivityTimeline events={idea.timeline} emptyTitle="لا يوجد سجل حالة بعد" />
      </div>

      {idea.informationRequestHistory.length > 0 && (
        <IdeaInformationRequestsSection
          history={idea.informationRequestHistory}
          completeInformationAction={idea.availableActions.completeInformation}
          onSubmitResponse={handleCompleteInformation}
          isSubmitting={isCompletingInformation}
        />
      )}

      {idea.decision && <IdeaDecisionSection decision={idea.decision} />}

      {idea.relatedProject && <IdeaRelatedProjectCard project={idea.relatedProject} />}

      <WithdrawIdeaModal
        isOpen={isWithdrawModalOpen}
        onClose={() => {
          setIsWithdrawModalOpen(false);
          feedback.clear();
        }}
        onConfirm={handleWithdraw}
        error={feedback.message}
      />
    </div>
  );
}
