import { useRef } from 'react';
import { Outlet, Navigate } from '@innovator/_compat/react-router-shim';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { usePageTitle } from './usePageTitle';
import { useAuth } from '@innovator/app/providers/AuthContext';
import { useFocusMainOnNavigate } from '@innovator/hooks/useFocusMainOnNavigate';
import { LoadingState } from '@innovator/components/shared/LoadingState';
import { SkipToContentLink } from '@innovator/components/shared/SkipToContentLink';

const MAIN_CONTENT_ID = 'main-content';

export function InnovatorLayout() {
  const { session, isLoading } = useAuth();
  const title = usePageTitle();
  const mainRef = useRef<HTMLElement>(null);
  useFocusMainOnNavigate(mainRef);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingState label="جاري التحقق من الجلسة..." />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/innovator/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-inv-canvas">
      <SkipToContentLink targetId={MAIN_CONTENT_ID} />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} />
        <main
          id={MAIN_CONTENT_ID}
          ref={mainRef}
          tabIndex={-1}
          className="flex-1 overflow-y-auto px-4 py-6 outline-none sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
