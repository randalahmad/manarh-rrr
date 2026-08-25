import { z } from 'zod';
import { EMPLOYMENT_STATUSES } from '@innovator/types/common';

export const profileFormSchema = z.object({
  fullName: z.string().min(1, 'الاسم الكامل مطلوب.'),
  phone: z.string().optional(),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
  organizationName: z.string().optional(),
  specialization: z.string().optional(),
  bio: z.string().optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
