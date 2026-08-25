import type { IdeaWorkflowError } from './services/ideaWorkflow';

const FALLBACK_MESSAGE = 'حدث خطأ غير متوقع. حاول مرة أخرى.';

const OPERATION_LABELS: Record<string, string> = {
  SAVE_DRAFT: 'حفظ المسودة',
  SUBMIT: 'إرسال الفكرة',
  WITHDRAW: 'سحب الفكرة',
  COMPLETE_INFORMATION: 'استكمال المعلومات',
};

/** Maps IdeaWorkflowErrorCode (+ details) → Arabic message. The only place workflow-error strings live — the workflow and services stay code-only. */
export function getIdeaWorkflowErrorMessage(error: IdeaWorkflowError | undefined): string {
  if (!error) return FALLBACK_MESSAGE;

  switch (error.code) {
    case 'INVALID_TRANSITION': {
      const label = error.details?.operation ? OPERATION_LABELS[error.details.operation] : undefined;
      return label
        ? `تعذر تنفيذ "${label}" — حالة الفكرة الحالية لا تسمح بذلك.`
        : 'تعذر تنفيذ هذا الإجراء في الحالة الحالية للفكرة.';
    }
    case 'ATTACHMENT_UPLOAD_FAILED': {
      const files = error.details?.failedFileNames ?? [];
      if (files.length === 0) return 'تعذر رفع أحد المرفقات. لم يتم حفظ الفكرة، حاول مرة أخرى.';
      return `تعذر رفع الملفات التالية: ${files.join('، ')}. لم يتم حفظ الفكرة — تحقق من الملفات وحاول مرة أخرى.`;
    }
    case 'SAVE_FAILED':
      return 'تعذر حفظ المسودة. حاول مرة أخرى.';
    case 'SUBMIT_FAILED':
      return 'تعذر إرسال الفكرة. حاول مرة أخرى.';
    case 'WITHDRAW_FAILED':
      return 'تعذر سحب الفكرة. حاول مرة أخرى.';
    case 'COMPLETE_INFORMATION_FAILED':
      return 'تعذر إرسال الاستكمال. حاول مرة أخرى.';
    default:
      return FALLBACK_MESSAGE;
  }
}
