import { useState } from 'react';
import { Link } from '@innovator/_compat/react-router-shim';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, MailCheck } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@innovator/features/auth/schemas';
import { authService, AuthError } from '@innovator/features/auth/services/authService';
import { getAuthErrorMessage } from '@innovator/features/auth/errorMessages';
import { AuthCardHeader } from '@innovator/features/auth/components/AuthCardHeader';
import { useFormFeedback } from '@innovator/hooks/useFormFeedback';
import { FormAlert } from '@innovator/components/shared/FormAlert';
import { Input } from '@innovator/components/ui/Input';
import { Button } from '@innovator/components/ui/Button';

export function ForgotPasswordPage() {
  const feedback = useFormFeedback();
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    feedback.clear();
    try {
      await authService.forgotPassword(values);
      setSentToEmail(values.email);
    } catch (error) {
      feedback.setError(getAuthErrorMessage(error instanceof AuthError ? error.code : undefined));
    }
  };

  if (sentToEmail) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-inv-status-success-bg text-inv-status-success-fg">
            <MailCheck className="size-6" aria-hidden="true" />
          </div>
          <AuthCardHeader
            title="تم إرسال رابط الاستعادة"
            description={`إذا كان البريد "${sentToEmail}" مرتبطًا بحساب، فستصلك رسالة تحتوي على رابط لإعادة تعيين كلمة المرور.`}
          />
        </div>
        <Link to="/innovator/login" className="self-center">
          <Button variant="outline" size="md">
            <ArrowRight className="size-4" aria-hidden="true" />
            العودة إلى تسجيل الدخول
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AuthCardHeader
        title="نسيت كلمة المرور"
        description="أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور."
      />

      <FormAlert message={feedback.message} tone={feedback.tone} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <Input
          label="البريد الإلكتروني"
          type="email"
          autoComplete="email"
          autoFocus
          required
          error={errors.email?.message}
          {...register('email')}
        />

        <Button type="submit" size="lg" isLoading={isSubmitting} disabled={isSubmitting} className="w-full">
          إرسال رابط الاستعادة
        </Button>

        <Link
          to="/innovator/login"
          className="flex items-center justify-center gap-1.5 text-sm font-medium text-inv-brand-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700 rounded-inv-control"
        >
          <ArrowRight className="size-3.5" aria-hidden="true" />
          العودة إلى تسجيل الدخول
        </Link>
      </form>
    </div>
  );
}
