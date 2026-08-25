import { z } from 'zod';

/**
 * Two strictness levels over the same field set:
 * - `ideaDraftSchema`: only the title is required — a draft can be saved
 *   incomplete.
 * - `ideaFormSchema`: every field required before a real submission.
 *
 * Deliberately NO minimum character lengths anywhere — the PRD doesn't
 * confirm any, so only presence/absence is validated. Add length rules
 * later only once a real business rule is confirmed.
 */

export const ideaDraftSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب.'),
  organizationId: z.string(),
  category: z.string(),
  description: z.string(),
  problem: z.string(),
  proposedSolution: z.string(),
  expectedImpact: z.string(),
  ideaStage: z.string().optional(),
  supportType: z.string().optional(),
  additionalNotes: z.string().optional(),
});

export const ideaFormSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب.'),
  organizationId: z.string().min(1, 'الجهة المستقبلة مطلوبة.'),
  category: z.string().min(1, 'التصنيف مطلوب.'),
  description: z.string().min(1, 'وصف الفكرة مطلوب.'),
  problem: z.string().min(1, 'المشكلة أو التحدي مطلوب.'),
  proposedSolution: z.string().min(1, 'الحل المقترح مطلوب.'),
  expectedImpact: z.string().min(1, 'الأثر المتوقع مطلوب.'),
  ideaStage: z.string().optional(),
  supportType: z.string().optional(),
  additionalNotes: z.string().optional(),
});

export const completeInformationSchema = z.object({
  response: z.string().min(1, 'الرد مطلوب.'),
});
