import { IDEA_STATUSES } from '../types';
import type { IdeaStatus, IdeaSortOption } from '../types';
import { IDEA_STATUS_CONFIG } from '../status.config';
import { IDEA_SORT_OPTIONS } from '../sortOptions';
import type { IdeaListQueryState } from '../hooks/useIdeaListQuery';
import { useOrganizations } from '@innovator/hooks/useOrganizations';
import { useCategories } from '@innovator/hooks/useCategories';
import { ListToolbar } from '@innovator/components/shared/ListToolbar';
import { FilterBar } from '@innovator/components/shared/FilterBar';
import { SearchInput } from '@innovator/components/shared/SearchInput';
import { Select } from '@innovator/components/ui/Select';

export interface IdeasToolbarProps {
  state: IdeaListQueryState;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: IdeaStatus | '') => void;
  onOrganizationChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSortChange: (value: IdeaSortOption) => void;
  onReset: () => void;
}

export function IdeasToolbar({
  state,
  hasActiveFilters,
  onSearchChange,
  onStatusChange,
  onOrganizationChange,
  onCategoryChange,
  onSortChange,
  onReset,
}: IdeasToolbarProps) {
  const organizationsQuery = useOrganizations();
  // Categories are organization-scoped on the real backend — the category
  // filter only has options once an organization filter is chosen.
  const categoriesQuery = useCategories(state.organizationId || undefined);

  const statusOptions = IDEA_STATUSES.map((status) => ({ value: status, label: IDEA_STATUS_CONFIG[status].label }));
  const organizationOptions = (organizationsQuery.data ?? []).map((org) => ({ value: org.id, label: org.name }));
  const categoryOptions = (categoriesQuery.data ?? []).map((category) => ({ value: category.id, label: category.name }));

  return (
    <ListToolbar
      leftSlot={<SearchInput value={state.search} onChange={onSearchChange} placeholder="ابحث في أفكاري..." />}
      rightSlot={
        <Select
          aria-label="ترتيب حسب"
          value={state.sort}
          onChange={(e) => onSortChange(e.target.value as IdeaSortOption)}
          options={IDEA_SORT_OPTIONS}
        />
      }
      actionsSlot={
        <FilterBar onReset={onReset} hasActiveFilters={hasActiveFilters}>
          <Select
            aria-label="تصفية حسب الحالة"
            placeholder="كل الحالات"
            value={state.status}
            onChange={(e) => onStatusChange(e.target.value as IdeaStatus | '')}
            options={statusOptions}
          />
          <Select
            aria-label="تصفية حسب الجهة"
            placeholder="كل الجهات"
            value={state.organizationId}
            onChange={(e) => onOrganizationChange(e.target.value)}
            options={organizationOptions}
          />
          <Select
            aria-label="تصفية حسب التصنيف"
            placeholder="كل التصنيفات"
            value={state.categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            options={categoryOptions}
          />
        </FilterBar>
      }
    />
  );
}
