import { Link } from '@innovator/_compat/react-router-shim';
import { Building2 } from 'lucide-react';
import type { PublicOrganizationViewModel } from '../viewModels';
import { Button } from '@innovator/components/ui/Button';

export interface PublicOrganizationHeroProps {
  organization: PublicOrganizationViewModel;
}

export function PublicOrganizationHero({ organization }: PublicOrganizationHeroProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-inv-card border border-inv-ink-100 bg-inv-surface p-8 text-center sm:p-10">
      <div className="flex size-16 items-center justify-center rounded-full bg-inv-brand-50 text-inv-brand-800">
        {organization.logoUrl ? (
          <img src={organization.logoUrl} alt={organization.name} className="size-16 rounded-full object-cover" />
        ) : (
          <Building2 className="size-7" aria-hidden="true" />
        )}
      </div>

      <div>
        <h1 className="font-inv-display text-2xl font-bold text-inv-ink-900">{organization.name}</h1>
        {organization.description && <p className="mt-2 max-w-xl text-sm text-inv-ink-500">{organization.description}</p>}
      </div>

      <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
        {organization.primaryAction.enabled && (
          <Link to={organization.primaryAction.route!}>
            <Button size="lg">{organization.primaryAction.label}</Button>
          </Link>
        )}
        {organization.secondaryAction?.enabled && (
          <Link
            to={organization.secondaryAction.route!}
            className="text-sm font-medium text-inv-brand-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700 rounded-inv-control"
          >
            {organization.secondaryAction.label}
          </Link>
        )}
      </div>
    </div>
  );
}
