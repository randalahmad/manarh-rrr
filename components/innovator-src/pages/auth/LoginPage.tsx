import { Link, useNavigate, useLocation } from '@innovator/_compat/react-router-shim';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@innovator/features/auth/schemas';
import { useAuth } from '@innovator/app/providers/AuthContext';
import { AuthError } from '@innovator/features/auth/services/authService';
import { getAuthErrorMessage } from '@innovator/features/auth/errorMessages';
import { AuthCardHeader } from '@innovator/features/auth/components/AuthCardHeader';
import { useFormFeedback } from '@innovator/hooks/useFormFeedback';
import { FormAlert } from '@innovator/components/shared/FormAlert';
import { Input } from '@innovator/components/ui/Input';
import { PasswordInput } from '@innovator/components/ui/PasswordInput';
import { Button } from '@innovator/components/ui/Button';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const feedback = useFormFeedback();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    feedback.clear();
    try {
      await login(values);
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/innovator/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      feedback.setError(getAuthErrorMessage(error instanceof AuthError ? error.code : undefined));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AuthCardHeader title="تسجيل الدخول" description="أدخل بيانات حسابك للوصول إلى لوحة المبتكر." />

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

        <PasswordInput
          label="كلمة المرور"
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" size="lg" isLoading={isSubmitting} disabled={isSubmitting} className="w-full">
          تسجيل الدخول
        </Button>

        <Link
          to="/innovator/forgot-password"
          className="self-center text-sm font-medium text-inv-brand-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700 rounded-inv-control"
        >
          نسيت كلمة المرور؟
        </Link>
      </form>
    </div>
  );
}
