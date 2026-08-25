import { NavLink } from '@innovator/_compat/react-router-shim';
import { User as UserIcon, LogOut } from 'lucide-react';
import { INNOVATOR_NAV_ITEMS } from '@innovator/constants/navigation';
import { useAuth } from '@innovator/app/providers/AuthContext';
import { cn } from '@innovator/utils/cn';

export interface SidebarNavProps {
  onNavigate?: () => void;
}

/** Shared navigation list — rendered inside the desktop Sidebar and the mobile Drawer alike. */
export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { logout } = useAuth();

  return (
    <div className="flex h-full flex-col justify-between">
      <nav aria-label="التنقل الرئيسي" className="flex flex-col gap-1 p-3">
        {INNOVATOR_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-inv-control px-3 py-2.5 text-sm font-medium transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700',
                isActive ? 'bg-inv-brand-900 text-white' : 'text-inv-ink-700 hover:bg-inv-ink-50',
              )
            }
          >
            <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-inv-ink-100 p-3">
        <NavLink
          to="/innovator/profile"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-inv-control px-3 py-2.5 text-sm font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700',
              isActive ? 'bg-inv-brand-900 text-white' : 'text-inv-ink-700 hover:bg-inv-ink-50',
            )
          }
        >
          <UserIcon className="size-4.5 shrink-0" aria-hidden="true" />
          الملف الشخصي
        </NavLink>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            logout();
          }}
          className="flex items-center gap-3 rounded-inv-control px-3 py-2.5 text-sm font-medium text-inv-ink-700 transition-colors hover:bg-inv-ink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700"
        >
          <LogOut className="size-4.5 shrink-0" aria-hidden="true" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
