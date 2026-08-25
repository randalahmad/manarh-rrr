import { usePathname } from 'next/navigation';

const TITLE_ROUTES: { pattern: string; title: string }[] = [
  { pattern: '/innovator/dashboard', title: 'الرئيسية' },
  { pattern: '/innovator/ideas/new', title: 'تقديم فكرة' },
  { pattern: '/innovator/ideas/:id/edit', title: 'متابعة تقديم فكرة' },
  { pattern: '/innovator/ideas/:id', title: 'تفاصيل الفكرة' },
  { pattern: '/innovator/ideas', title: 'أفكاري' },
  { pattern: '/innovator/projects/:id', title: 'تفاصيل المشروع' },
  { pattern: '/innovator/projects', title: 'مشاريعي' },
  { pattern: '/innovator/notifications', title: 'الإشعارات' },
  { pattern: '/innovator/profile', title: 'الملف الشخصي' },
];

// react-router's `matchPath` isn't available under Next.js — this is a
// direct, dependency-free re-implementation of the same ":param" pattern
// matching used by TITLE_ROUTES above (behavior unchanged).
function matchesPattern(pattern: string, pathname: string): boolean {
  const regex = new RegExp(
    '^' + pattern.replace(/:[^/]+/g, '[^/]+').replace(/\//g, '\\/') + '$',
  );
  return regex.test(pathname);
}

export function usePageTitle(): string {
  const pathname = usePathname();
  const match = TITLE_ROUTES.find((route) => matchesPattern(route.pattern, pathname));
  return match?.title ?? 'منارة';
}
