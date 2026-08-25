import { useParams } from '@innovator/_compat/react-router-shim';
import { useOrganizationBySlug } from '@innovator/hooks/useOrganizationBySlug';
import { useAuth } from '@innovator/app/providers/AuthContext';
import { mapOrganizationToPublicViewModel } from '@innovator/features/external/viewModels';
import { PublicOrganizationHero } from '@innovator/features/external/components/PublicOrganizationHero';
import { LoadingState } from '@innovator/components/shared/LoadingState';
import { ErrorState } from '@innovator/components/shared/ErrorState';

export function PublicOrganizationPage() {
  const { organizationSlug } = useParams<{ organizationSlug: string }>();
  const { session } = useAuth();
  const orgQuery = useOrganizationBySlug(organizationSlug);

  if (orgQuery.isLoading) {
    return <LoadingState label="جاري تحميل صفحة الجهة..." />;
  }

  if (orgQuery.isError || !orgQuery.data) {
    return (
      <ErrorState
        title="تعذر العثور على الجهة"
        description="تحقق من الرابط أو حاول مرة أخرى لاحقًا."
        onRetry={() => orgQuery.refetch()}
      />
    );
  }

  const organization = mapOrganizationToPublicViewModel(orgQuery.data, Boolean(session));

  return <PublicOrganizationHero organization={organization} />;
}
