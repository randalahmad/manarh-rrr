import { useProfile } from '@innovator/features/profile/hooks/useProfile';
import { useUpdateProfile } from '@innovator/features/profile/hooks/useUpdateProfile';
import type { ProfileFormValues } from '@innovator/features/profile/schemas';
import { useFormFeedback } from '@innovator/hooks/useFormFeedback';
import { ProfileAvatar } from '@innovator/features/profile/components/ProfileAvatar';
import { ProfileForm } from '@innovator/features/profile/components/ProfileForm';
import { ChangePasswordEntryPoint } from '@innovator/features/profile/components/ChangePasswordEntryPoint';

import { PageHeader } from '@innovator/components/shared/PageHeader';
import { FormAlert } from '@innovator/components/shared/FormAlert';
import { LoadingState } from '@innovator/components/shared/LoadingState';
import { ErrorState } from '@innovator/components/shared/ErrorState';
import { Card, CardBody, CardHeader } from '@innovator/components/ui/Card';

export function ProfilePage() {
  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();
  const feedback = useFormFeedback();

  const handleSubmit = (values: ProfileFormValues) => {
    feedback.clear();
    updateProfile.mutate(
      {
        fullName: values.fullName,
        phone: values.phone || undefined,
        employmentStatus: values.employmentStatus || undefined,
        organizationName: values.organizationName || undefined,
        specialization: values.specialization || undefined,
        bio: values.bio || undefined,
      },
      {
        onSuccess: () => feedback.setSuccess('تم حفظ التغييرات بنجاح.'),
        onError: () => feedback.setError('تعذر حفظ التغييرات. حاول مرة أخرى.'),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="الملف الشخصي" description="بياناتك الشخصية وإعدادات حسابك." />

      {profileQuery.isLoading ? (
        <LoadingState label="جاري تحميل الملف الشخصي..." />
      ) : profileQuery.isError || !profileQuery.data ? (
        <ErrorState onRetry={() => profileQuery.refetch()} />
      ) : (
        <>
          <FormAlert message={feedback.message} tone={feedback.tone} />

          <Card>
            <CardHeader>
              <h2 className="font-inv-display font-bold text-inv-ink-900">الصورة الشخصية</h2>
            </CardHeader>
            <CardBody>
              <ProfileAvatar name={profileQuery.data.fullName} imageUrl={profileQuery.data.avatarUrl} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-inv-display font-bold text-inv-ink-900">البيانات الشخصية</h2>
            </CardHeader>
            <CardBody>
              <ProfileForm user={profileQuery.data} onSubmit={handleSubmit} isSaving={updateProfile.isPending} />
            </CardBody>
          </Card>

          <ChangePasswordEntryPoint />
        </>
      )}
    </div>
  );
}
