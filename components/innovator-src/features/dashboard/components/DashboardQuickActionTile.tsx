import { Link } from '@innovator/_compat/react-router-shim';
import type { LucideIcon } from 'lucide-react';
import { PlusCircle, FileEdit, ClipboardList, Lightbulb, FolderKanban, Bell } from 'lucide-react';
import type { DashboardQuickAction } from '../types';
import { Card } from '@innovator/components/ui/Card';

export interface DashboardQuickActionTileProps {
  action: DashboardQuickAction;
}

const ICON_MAP: Record<string, LucideIcon> = {
  submit: PlusCircle,
  draft: FileEdit,
  complete: ClipboardList,
  ideas: Lightbulb,
  projects: FolderKanban,
  notifications: Bell,
};

export function DashboardQuickActionTile({ action }: DashboardQuickActionTileProps) {
  const Icon = ICON_MAP[action.icon] ?? PlusCircle;

  return (
    <Link to={action.to} className="block rounded-inv-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700">
      <Card className="flex flex-col items-center gap-2 p-4 text-center transition-shadow hover:shadow-sm hover:border-inv-ink-200">
        <div className="flex size-11 items-center justify-center rounded-inv-control bg-inv-brand-50 text-inv-brand-800">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <span className="text-sm font-medium text-inv-ink-900">{action.label}</span>
      </Card>
    </Link>
  );
}
