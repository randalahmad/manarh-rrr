import { Link, Navigate, useNavigate, useParams } from '@innovator/_compat/react-router-shim';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { externalRegistrationSchema, type ExternalRegistrationFormValues } from '@innovator/features/auth/schemas';
import { useAuth } from '@innovator/app/providers/AuthContext';
import { AuthError } from '@innovator/features/auth/services/authService';
import { getAuthErrorMessage } from '@innovator/features/auth/errorMessages';
import { useOrganizationBySlug } from '@innovator/hooks/useOrganizationBySlug';
import { useFormFeedback } from '@innovator/hooks/useFormFeedback';
import { AuthCardHeader } from '@innovator/features/auth/components/AuthCardHeader';
import { FormAlert } from '@innovator/components/shared/FormAlert';
import { Input } from '@innovator/components/ui/Input';
import { PasswordInput } from '@innovator/components/ui/PasswordInput';
import { Button } from '@innovator/components/ui/Button';
import { LoadingState } from '@innovator/components/shared/LoadingState';
import { ErrorState } from '@innovator/components/shared/ErrorState';

export function ExternalRegisterPage() {
  const { organizationSlug } = useParams<{ organizationSlug: string }>();
  const { session, registerExternal } = useAuth();
  const navigate = useNavigate();
  const orgQuery = useOrganizationBySlug(organizationSlug);
  const feedback = useFormFeedback();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ExternalRegistrationFormValues>({
    resolver: zodResolver(externalRegistrationSchema),
  });

  // Already signed in — registering again would silently replace the active
  // session. Send them to the app instead of re-running this flow.
  if (session) {
    return <Navigate to="/innovator/dashboard" replace />;
  }

  if (orgQuery.isLoading) {
    return <LoadingState label="جاري تحميل بيانات الجهة..." />;
  }

  if (orgQuery.isError || !orgQuery.data) {
    return <ErrorState title="تعذر العثور على الجهة" onRetry={() => orgQuery.refetch()} />;
  }

  const organization = orgQuery.data;

  const onSubmit = async (values: ExternalRegistrationFormValues) => {
    feedback.clear();
    try {
      await registerExternal({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        organizationSlug: organization.slug,
      });
      navigate(`/innovator/ideas/new?organizationId=${organization.id}`, { replace: true });
    } catch (error) {
      feedback.setError(getAuthErrorMessage(error instanceof AuthError ? error.code : undefined));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AuthCardHeader
        title="تسجيل حساب جديد"
        description={`أنشئ حسابًا لتقديم فكرتك إلى ${organization.name}.`}
      />

      <FormAlert message={feedback.message} tone={feedback.tone} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <Input
          label="الاسم الكامل"
          autoComplete="name"
          autoFocus
          required
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input
          label="البريد الإلكتروني"
          type="email"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register('email')}
        />
        <Input label="رقم الجوال" type="tel" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
        <PasswordInput
          label="كلمة المرور"
          autoComplete="new-password"
          required
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordInput
          label="تأكيد كلمة المرور"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" size="lg" isLoading={isSubmitting} disabled={isSubmitting} className="w-full">
          إنشاء الحساب
        </Button>

        <Link
          to="/innovator/login"
          className="self-center text-sm font-medium text-inv-brand-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700 rounded-inv-control"
        >
          لدي حساب بالفعل — تسجيل الدخول
        </Link>
      </form>
    </div>
  );
}
