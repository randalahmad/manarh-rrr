import type { IdeaDetailsViewModel } from '../../viewModels';
import { Card, CardBody, CardHeader } from '@innovator/components/ui/Card';

export interface IdeaDetailsSummaryProps {
  idea: IdeaDetailsViewModel;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-inv-ink-900">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-inv-ink-700">{value}</p>
    </div>
  );
}

export function IdeaDetailsSummary({ idea }: IdeaDetailsSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-inv-display font-bold text-inv-ink-900">تفاصيل الفكرة</h2>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <Field label="وصف الفكرة" value={idea.description} />
        <Field label="المشكلة أو التحدي" value={idea.problem} />
        <Field label="الحل المقترح" value={idea.proposedSolution} />
        <Field label="الأثر المتوقع" value={idea.expectedImpact} />
        {idea.ideaStage && <Field label="مرحلة الفكرة أو المشروع" value={idea.ideaStage} />}
        {idea.supportType && <Field label="نوع الدعم المطلوب" value={idea.supportType} />}
        {idea.additionalNotes && <Field label="ملاحظات إضافية" value={idea.additionalNotes} />}
      </CardBody>
    </Card>
  );
}
