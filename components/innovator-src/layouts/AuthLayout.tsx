import { Navigate, Outlet } from '@innovator/_compat/react-router-shim';
import { useAuth } from '@innovator/app/providers/AuthContext';

export function AuthLayout() {
  const { session, isLoading } = useAuth();

  // Already signed in — visiting /login or /forgot-password again would
  // only risk clobbering the active session for no benefit. One guard here
  // covers both pages instead of duplicating the check in each.
  if (!isLoading && session) {
    return <Navigate to="/innovator/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-inv-canvas px-4 py-12 sm:px-6">
      <div className="flex w-full max-w-[500px] flex-col items-center">
        <div className="mb-10 flex flex-col items-center gap-5 text-center">
          <svg viewBox="0 0 32 32" className="size-[76px]" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="var(--color-inv-brand-900)" />
            <path d="M16 6 L23 24 H9 Z" fill="none" stroke="var(--color-inv-beacon-500)" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="16" cy="12" r="2.2" fill="var(--color-inv-beacon-500)" />
          </svg>
          <div className="flex flex-col gap-2">
            <h1 className="font-inv-display text-3xl font-extrabold text-inv-ink-900">منارة</h1>
            <p className="text-sm text-inv-ink-500">منصة إدارة وحوكمة دورة حياة الابتكار</p>
          </div>
        </div>
        <div className="w-full rounded-inv-card border border-inv-ink-100 bg-inv-surface p-8 shadow-[0_1px_2px_rgba(20,30,28,0.04),0_8px_24px_rgba(20,30,28,0.06)] sm:p-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
