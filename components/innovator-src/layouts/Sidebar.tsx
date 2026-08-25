import { Link } from '@innovator/_compat/react-router-shim';
import { SidebarNav } from './SidebarNav';

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-e border-inv-ink-100 bg-inv-surface lg:flex lg:flex-col">
      <Link to="/innovator/dashboard" className="flex items-center gap-2 px-5 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700 rounded-inv-control">
        <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
          <rect width="32" height="32" rx="7" fill="var(--color-inv-brand-900)" />
          <path d="M16 6 L23 24 H9 Z" fill="none" stroke="var(--color-inv-beacon-500)" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="16" cy="12" r="2.2" fill="var(--color-inv-beacon-500)" />
        </svg>
        <span className="font-inv-display text-lg font-bold text-inv-ink-900">منارة</span>
      </Link>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
    </aside>
  );
}
