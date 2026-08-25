import { Link } from '@innovator/_compat/react-router-shim';
import { Pencil, XCircle, FileQuestion, FolderKanban } from 'lucide-react';
import type { IdeaDetailsAvailableActions } from '../../viewModels';
import { Button } from '@innovator/components/ui/Button';

export interface IdeaDetailsActionsProps {
  availableActions: IdeaDetailsAvailableActions;
  onWithdrawClick: () => void;
}

/** Same-page anchors (routes starting with "#") use a plain link so the browser scrolls in place; real routes go through React Router's Link. */
function ActionLink({ route, children }: { route: string; children: React.ReactNode }) {
  if (route.startsWith('#')) {
    return <a href={route}>{children}</a>;
  }
  return <Link to={route}>{children}</Link>;
}

export function IdeaDetailsActions({ availableActions, onWithdrawClick }: IdeaDetailsActionsProps) {
  const hasAnyAction =
    availableActions.edit || availableActions.withdraw || availableActions.completeInformation || availableActions.viewProject;

  if (!hasAnyAction) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {availableActions.edit && (
        <ActionLink route={availableActions.edit.route!}>
          <Button variant="outline" size="md">
            <Pencil className="size-4" aria-hidden="true" />
            {availableActions.edit.label}
          </Button>
        </ActionLink>
      )}
      {availableActions.completeInformation && (
        <ActionLink route={availableActions.completeInformation.route!}>
          <Button variant="secondary" size="md">
            <FileQuestion className="size-4" aria-hidden="true" />
            {availableActions.completeInformation.label}
          </Button>
        </ActionLink>
      )}
      {availableActions.viewProject && (
        <ActionLink route={availableActions.viewProject.route!}>
          <Button variant="secondary" size="md">
            <FolderKanban className="size-4" aria-hidden="true" />
            {availableActions.viewProject.label}
          </Button>
        </ActionLink>
      )}
      {availableActions.withdraw && (
        <Button variant="ghost" size="md" onClick={onWithdrawClick}>
          <XCircle className="size-4" aria-hidden="true" />
          {availableActions.withdraw.label}
        </Button>
      )}
    </div>
  );
}
