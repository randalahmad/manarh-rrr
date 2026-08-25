import type { IdeaCardViewModel } from '../viewModels';
import { IdeaCard } from './IdeaCard';

export interface IdeasListProps {
  items: IdeaCardViewModel[];
  /** Grid columns at the widest breakpoint. Dashboard uses 2 (compact); My Ideas can use more if desired. */
  columns?: 2 | 3;
}

/**
 * Renders a collection of already-mapped idea view models as cards. Never
 * receives raw `Idea` entities — callers (pages) are responsible for
 * mapping via `mapIdeaToCardViewModel`. Kept as its own component so the
 * presentation — cards today, potentially a table later — can change in one
 * place without touching every page that lists ideas.
 */
export function IdeasList({ items, columns = 2 }: IdeasListProps) {
  return (
    <div className={columns === 3 ? 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3' : 'grid grid-cols-1 gap-3 lg:grid-cols-2'}>
      {items.map((item) => (
        <IdeaCard key={item.id} item={item} />
      ))}
    </div>
  );
}
