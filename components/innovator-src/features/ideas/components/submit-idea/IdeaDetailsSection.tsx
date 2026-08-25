import { useFormContext } from 'react-hook-form';
import type { IdeaFormValues } from '../../types';
import { Card, CardBody, CardHeader } from '@innovator/components/ui/Card';
import { Input } from '@innovator/components/ui/Input';
import { Textarea } from '@innovator/components/ui/Textarea';

export function IdeaDetailsSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<IdeaFormValues>();

  return (
    <Card>
      <CardHeader>
        <h2 className="font-inv-display font-bold text-inv-ink-900">تفاصيل الفكرة</h2>
      </CardHeader>
      <CardBody className="flex flex-col gap-5">
        <Textarea label="وصف الفكرة" required rows={4} error={errors.description?.message} {...register('description')} />
        <Textarea label="المشكلة أو التحدي" required rows={3} error={errors.problem?.message} {...register('problem')} />
        <Textarea
          label="الحل المقترح"
          required
          rows={3}
          error={errors.proposedSolution?.message}
          {...register('proposedSolution')}
        />
        <Textarea
          label="الأثر المتوقع"
          required
          rows={3}
          error={errors.expectedImpact?.message}
          {...register('expectedImpact')}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="مرحلة الفكرة أو المشروع"
            hint="حقل نصي مؤقت — سيتحول إلى قائمة اختيار عند اعتماد القيم الرسمية."
            error={errors.ideaStage?.message}
            {...register('ideaStage')}
          />
          <Input
            label="نوع الدعم المطلوب"
            hint="حقل نصي مؤقت — سيتحول إلى قائمة اختيار عند اعتماد القيم الرسمية."
            error={errors.supportType?.message}
            {...register('supportType')}
          />
        </div>
        <Textarea
          label="ملاحظات إضافية"
          rows={3}
          error={errors.additionalNotes?.message}
          {...register('additionalNotes')}
        />
      </CardBody>
    </Card>
  );
}
