import { useFormContext } from 'react-hook-form';
import type { IdeaFormValues } from '../../types';
import { useOrganizations } from '@innovator/hooks/useOrganizations';
import { useCategories } from '@innovator/hooks/useCategories';
import { Card, CardBody, CardHeader } from '@innovator/components/ui/Card';
import { Input } from '@innovator/components/ui/Input';
import { Select } from '@innovator/components/ui/Select';

export function IdeaBasicInfoSection() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<IdeaFormValues>();

  const organizationsQuery = useOrganizations();
  // Categories are organization-scoped on the real backend (Phase 6, Group
  // B) — the category picker follows whichever organization is currently
  // selected in the form, and is empty/disabled until one is chosen.
  const selectedOrganizationId = watch('organizationId');
  const categoriesQuery = useCategories(selectedOrganizationId || undefined);

  const organizationOptions = (organizationsQuery.data ?? []).map((org) => ({ value: org.id, label: org.name }));
  const categoryOptions = (categoriesQuery.data ?? []).map((category) => ({ value: category.id, label: category.name }));

  return (
    <Card>
      <CardHeader>
        <h2 className="font-inv-display font-bold text-inv-ink-900">معلومات أساسية</h2>
      </CardHeader>
      <CardBody className="flex flex-col gap-5">
        <Input label="عنوان الفكرة" required error={errors.title?.message} {...register('title')} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Select
            label="الجهة المستقبلة"
            placeholder="اختر الجهة"
            required
            error={errors.organizationId?.message}
            options={organizationOptions}
            {...register('organizationId')}
          />
          <Select
            label="التصنيف"
            placeholder={selectedOrganizationId ? 'اختر التصنيف' : 'اختر الجهة أولاً'}
            required
            disabled={!selectedOrganizationId}
            error={errors.category?.message}
            options={categoryOptions}
            {...register('category')}
          />
        </div>
      </CardBody>
    </Card>
  );
}
