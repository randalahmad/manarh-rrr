import { Save, Send } from 'lucide-react';
import { Button } from '@innovator/components/ui/Button';

export interface IdeaFormActionsProps {
  onSaveDraft: () => void;
  onSubmit: () => void;
  isSavingDraft: boolean;
  isSubmitting: boolean;
}

export function IdeaFormActions({ onSaveDraft, onSubmit, isSavingDraft, isSubmitting }: IdeaFormActionsProps) {
  const disabled = isSavingDraft || isSubmitting;

  return (
    <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-3 border-t border-inv-ink-100 bg-inv-surface px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
      <Button variant="outline" size="lg" onClick={onSaveDraft} isLoading={isSavingDraft} disabled={disabled}>
        <Save className="size-4" aria-hidden="true" />
        حفظ كمسودة
      </Button>
      <Button size="lg" onClick={onSubmit} isLoading={isSubmitting} disabled={disabled}>
        <Send className="size-4" aria-hidden="true" />
        إرسال الفكرة
      </Button>
    </div>
  );
}
