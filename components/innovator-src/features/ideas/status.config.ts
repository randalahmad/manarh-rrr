import type { IdeaStatus } from './types';
import type { StatusTone } from '@innovator/types/status';

export type { StatusTone };

interface IdeaStatusConfigEntry {
  label: string;
  tone: StatusTone;
  /** Short description shown in tooltips / detail headers. */
  description: string;
}

/**
 * Single source of truth for idea status → Arabic label / visual tone.
 * Do NOT duplicate this mapping inside components — import from here.
 *
 * The 6 entries marked "Phase 6 Group B addition" below use the label/tone
 * already approved and shipped for these exact statuses in the Org Admin
 * interface (lib/utils.ts's IDEA_STATUS_LABELS/IDEA_STATUS_TONE) — borrowed
 * verbatim, not newly invented copy. Only the `description` sentence (a
 * field the Org Admin config doesn't have) is newly written here, in the
 * same neutral style as the existing entries.
 */
export const IDEA_STATUS_CONFIG: Record<IdeaStatus, IdeaStatusConfigEntry> = {
  DRAFT: {
    label: 'مسودة',
    tone: 'neutral',
    description: 'لم يتم إرسال الفكرة بعد، ولا يزال بإمكانك تعديلها.',
  },
  SUBMITTED: {
    label: 'تم الإرسال',
    tone: 'info',
    description: 'تم استلام فكرتك وهي بانتظار بدء المراجعة.',
  },
  // Phase 6 Group B addition — label/tone from lib/utils.ts IDEA_STATUS_LABELS/TONE.
  INITIAL_SCREENING: {
    label: 'الفرز الأولي',
    tone: 'info',
    description: 'فكرتك قيد الفرز الأولي قبل بدء المراجعة التفصيلية.',
  },
  UNDER_REVIEW: {
    label: 'قيد المراجعة',
    tone: 'info',
    description: 'الجهة المستقبلة تراجع تفاصيل فكرتك حاليًا.',
  },
  NEEDS_INFORMATION: {
    label: 'يحتاج استكمال معلومات',
    tone: 'warning',
    description: 'مطلوب منك استكمال معلومات أو مستندات إضافية.',
  },
  UNDER_EVALUATION: {
    label: 'قيد التقييم',
    tone: 'info',
    description: 'فكرتك قيد التقييم الفني والموضوعي.',
  },
  RECOMMENDATION_SUBMITTED: {
    label: 'تم رفع التوصية',
    tone: 'info',
    description: 'تم رفع توصية بخصوص فكرتك لأصحاب القرار.',
  },
  PENDING_DECISION: {
    label: 'بانتظار القرار',
    tone: 'warning',
    description: 'فكرتك بانتظار اتخاذ القرار النهائي.',
  },
  APPROVED: {
    label: 'معتمدة',
    tone: 'success',
    description: 'تم اعتماد فكرتك.',
  },
  // Phase 6 Group B addition — label/tone from lib/utils.ts IDEA_STATUS_LABELS/TONE.
  CONDITIONALLY_APPROVED: {
    label: 'اعتماد مشروط',
    tone: 'success',
    description: 'تم اعتماد فكرتك بشروط محددة.',
  },
  IDEA_DEVELOPMENT: {
    label: 'تطوير الفكرة',
    tone: 'info',
    description: 'فكرتك في مرحلة التطوير قبل تحويلها إلى مشروع.',
  },
  CONVERTED_TO_PROJECT: {
    label: 'تحولت إلى مشروع',
    tone: 'success',
    description: 'تم تحويل فكرتك إلى مشروع قيد التنفيذ.',
  },
  RETURNED_FOR_REVIEW: {
    label: 'معادة للمراجعة',
    tone: 'warning',
    description: 'تمت إعادة فكرتك لمراجعة إضافية.',
  },
  DEFERRED: {
    label: 'مؤجلة',
    tone: 'neutral',
    description: 'تم تأجيل النظر في فكرتك لوقت لاحق.',
  },
  NOT_PURSUED: {
    label: 'لن تتم متابعتها حاليًا',
    tone: 'danger',
    description: 'تقرر عدم المتابعة بهذه الفكرة حاليًا.',
  },
  // Phase 6 Group B addition — label/tone from lib/utils.ts IDEA_STATUS_LABELS/TONE.
  REJECTED: {
    label: 'مرفوضة',
    tone: 'danger',
    description: 'تقرر رفض هذه الفكرة.',
  },
  WITHDRAWN: {
    label: 'مسحوبة',
    tone: 'neutral',
    description: 'تم سحب هذه الفكرة من قبلك.',
  },
  // Phase 6 Group B addition — label/tone from lib/utils.ts IDEA_STATUS_LABELS/TONE.
  ARCHIVED: {
    label: 'مؤرشفة',
    tone: 'neutral',
    description: 'تمت أرشفة هذه الفكرة.',
  },
};

export function getIdeaStatusLabel(status: IdeaStatus): string {
  return IDEA_STATUS_CONFIG[status].label;
}

export function getIdeaStatusTone(status: IdeaStatus): StatusTone {
  return IDEA_STATUS_CONFIG[status].tone;
}
