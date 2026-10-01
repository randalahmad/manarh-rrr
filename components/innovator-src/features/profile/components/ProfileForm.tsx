import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { User } from '@innovator/types/common';
import { EMPLOYMENT_STATUSES } from '@innovator/types/common';
import { EMPLOYMENT_STATUS_CONFIG } from '../employmentStatus.config';
import { profileFormSchema, type ProfileFormValues } from '../schemas';
import { Input } from '@innovator/components/ui/Input';
import { Select } from '@innovator/components/ui/Select';
import { Textarea } from '@innovator/components/ui/Textarea';
import { Button } from '@innovator/components/ui/Button';

export interface ProfileFormProps {
  user: User;
  onSubmit: (values: ProfileFormValues) => void;
  isSaving: boolean;
}

function toDefaultValues(user: User): ProfileFormValues {
  return {
    fullName: user.fullName,
    phone: user.phone ?? '',
    employmentStatus: user.employmentStatus,
    organizationName: user.organizationName ?? '',
    specialization: user.specialization ?? '',
    bio: user.bio ?? '',
  };
}

const EMPLOYMENT_STATUS_OPTIONS = EMPLOYMENT_STATUSES.map((status) => ({
  value: status,
  label: EMPLOYMENT_STATUS_CONFIG[status].label,
}));

export function ProfileForm({ user, onSubmit, isSaving }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toDefaultValues(user),
  });

  // Keep the form in sync if the underlying profile data refreshes (e.g. after a save).
  useEffect(() => {
    reset(toDefaultValues(user));
  }, [user, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <Input
        label="البريد الإلكتروني"
        type="email"
        value={user.email}
        disabled
        hint="لا يمكن تغيير البريد الإلكتروني حاليًا."
      />
      <Input label="الاسم الكامل" value={user.fullName} disabled hint="لا يمكن تغيير الاسم حاليًا." />
      <Input label="رقم الجوال" type="tel" error={errors.phone?.message} {...register('phone')} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="الحالة"
          placeholder="اختر الحالة"
          options={EMPLOYMENT_STATUS_OPTIONS}
          error={errors.employmentStatus?.message}
          {...register('employmentStatus')}
        />
        <Input
          label="اسم الجهة (العمل أو الدراسة)"
          error={errors.organizationName?.message}
          {...register('organizationName')}
        />
      </div>

      <Input label="التخصص أو المجال" error={errors.specialization?.message} {...register('specialization')} />

      <Textarea
        label="ملخص تعريفي (الاهتمامات والتوجه)"
        rows={4}
        hint="يساعد المرشدين والموظفين على فهم اهتماماتك وتوجهك بسرعة."
        error={errors.bio?.message}
        {...register('bio')}
      />

      <Button type="submit" size="lg" isLoading={isSaving} disabled={isSaving} className="self-start">
        حفظ التغييرات
      </Button>
    </form>
  );
}
