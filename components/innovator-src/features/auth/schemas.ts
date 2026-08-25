import { z } from 'zod';

/**
 * Minimum password length is a UI-level sanity check only, not a confirmed
 * backend policy (password complexity rules aren't defined yet).
 */
const MIN_PASSWORD_LENGTH = 8;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'البريد الإلكتروني مطلوب.')
    .email('صيغة البريد الإلكتروني غير صحيحة.'),
  password: z
    .string()
    .min(1, 'كلمة المرور مطلوبة.')
    .min(MIN_PASSWORD_LENGTH, `يجب ألا تقل كلمة المرور عن ${MIN_PASSWORD_LENGTH} أحرف.`),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'البريد الإلكتروني مطلوب.')
    .email('صيغة البريد الإلكتروني غير صحيحة.'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const externalRegistrationSchema = z
  .object({
    fullName: z.string().min(1, 'الاسم الكامل مطلوب.'),
    email: z.string().min(1, 'البريد الإلكتروني مطلوب.').email('صيغة البريد الإلكتروني غير صحيحة.'),
    phone: z.string().optional(),
    password: z
      .string()
      .min(1, 'كلمة المرور مطلوبة.')
      .min(MIN_PASSWORD_LENGTH, `يجب ألا تقل كلمة المرور عن ${MIN_PASSWORD_LENGTH} أحرف.`),
    confirmPassword: z.string().min(1, 'تأكيد كلمة المرور مطلوب.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'كلمتا المرور غير متطابقتين.',
    path: ['confirmPassword'],
  });

export type ExternalRegistrationFormValues = z.infer<typeof externalRegistrationSchema>;
