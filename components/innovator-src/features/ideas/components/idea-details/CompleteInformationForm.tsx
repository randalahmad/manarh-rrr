import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { completeInformationSchema } from '../../schemas';
import type { InformationRequestViewModel } from '../../viewModels';
import { AttachmentUploader, type PendingAttachment } from '@innovator/components/shared/AttachmentUploader';
import { Textarea } from '@innovator/components/ui/Textarea';
import { Button } from '@innovator/components/ui/Button';

interface CompleteInformationFormValues {
  response: string;
}

export interface CompleteInformationFormProps {
  request: InformationRequestViewModel;
  onSubmit: (response: string, files: File[]) => Promise<void>;
  isSubmitting: boolean;
}

export function CompleteInformationForm({ request, onSubmit, isSubmitting }: CompleteInformationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteInformationFormValues>({
    resolver: zodResolver(completeInformationSchema),
    defaultValues: { response: '' },
  });

  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  const submitHandler = handleSubmit(async (values) => {
    await onSubmit(
      values.response,
      pendingAttachments.map((p) => p.file),
    );
  });

  return (
    <form onSubmit={submitHandler} noValidate className="flex flex-col gap-4 rounded-inv-control border border-inv-ink-100 bg-inv-canvas p-4">
      <div>
        <p className="text-sm font-medium text-inv-ink-900">الطلب</p>
        <p className="mt-1 text-sm text-inv-ink-700">{request.message}</p>
        <p className="mt-1 text-xs text-inv-ink-400">تاريخ الطلب: {request.requestedAtLabel}</p>
      </div>

      <Textarea label="الرد" required rows={4} error={errors.response?.message} {...register('response')} />

      <AttachmentUploader files={pendingAttachments} onFilesChange={setPendingAttachments} disabled={isSubmitting} />

      <Button type="submit" size="md" isLoading={isSubmitting} disabled={isSubmitting} className="self-start">
        إرسال الاستكمال
      </Button>
    </form>
  );
}
