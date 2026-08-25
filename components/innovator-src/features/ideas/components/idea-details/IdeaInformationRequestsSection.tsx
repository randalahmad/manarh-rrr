import type { InformationRequestViewModel } from '../../viewModels';
import type { ActionModel } from '@innovator/types/actions';
import { CompleteInformationForm } from './CompleteInformationForm';
import { Card, CardBody, CardHeader } from '@innovator/components/ui/Card';
import { Badge } from '@innovator/components/ui/Badge';

export interface IdeaInformationRequestsSectionProps {
  history: InformationRequestViewModel[];
  completeInformationAction?: ActionModel;
  onSubmitResponse: (requestId: string, response: string, files: File[]) => Promise<void>;
  isSubmitting: boolean;
}

export function IdeaInformationRequestsSection({
  history,
  completeInformationAction,
  onSubmitResponse,
  isSubmitting,
}: IdeaInformationRequestsSectionProps) {
  const activeRequest = history.find((r) => r.isActive);

  return (
    <Card id="complete-information">
      <CardHeader>
        <h2 className="font-inv-display font-bold text-inv-ink-900">طلبات استكمال المعلومات</h2>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {activeRequest && completeInformationAction?.enabled && (
          <CompleteInformationForm
            request={activeRequest}
            isSubmitting={isSubmitting}
            onSubmit={(response, files) => onSubmitResponse(activeRequest.id, response, files)}
          />
        )}

        <ul className="flex flex-col gap-3">
          {history.map((request) => (
            <li key={request.id} className="rounded-inv-control border border-inv-ink-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-inv-ink-900">{request.message}</p>
                <Badge tone={request.isActive ? 'warning' : 'success'}>
                  {request.isActive ? 'بانتظار الرد' : 'تم الرد'}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-inv-ink-400">تاريخ الطلب: {request.requestedAtLabel}</p>
              {!request.isActive && request.response && (
                <div className="mt-2 rounded-inv-control bg-inv-canvas p-2.5">
                  <p className="text-sm text-inv-ink-700">{request.response}</p>
                  <p className="mt-1 text-xs text-inv-ink-400">تاريخ الرد: {request.respondedAtLabel}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
