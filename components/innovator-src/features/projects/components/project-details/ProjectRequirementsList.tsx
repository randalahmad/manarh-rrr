import { ListChecks } from 'lucide-react';
import type { ProjectRequirementViewModel } from '../../viewModels';
import { Card, CardBody, CardHeader } from '@innovator/components/ui/Card';
import { StatusBadge } from '@innovator/components/shared/StatusBadge';
import { EmptyState } from '@innovator/components/shared/EmptyState';

export interface ProjectRequirementsListProps {
  requirements: ProjectRequirementViewModel[];
}

export function ProjectRequirementsList({ requirements }: ProjectRequirementsListProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-inv-display font-bold text-inv-ink-900">المتطلبات</h2>
      </CardHeader>
      <CardBody>
        {requirements.length === 0 ? (
          <EmptyState icon={ListChecks} title="لا توجد متطلبات مسجّلة بعد" />
        ) : (
          <ul className="flex flex-col gap-2">
            {requirements.map((requirement) => (
              <li
                key={requirement.id}
                className="flex items-center justify-between gap-3 rounded-inv-control border border-inv-ink-100 px-3 py-2"
              >
                <span className="text-sm text-inv-ink-900">{requirement.title}</span>
                <StatusBadge label={requirement.status.label} tone={requirement.status.tone} />
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
