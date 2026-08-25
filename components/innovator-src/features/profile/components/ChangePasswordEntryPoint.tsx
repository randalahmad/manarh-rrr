import { Link } from '@innovator/_compat/react-router-shim';
import { KeyRound, ChevronLeft } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@innovator/components/ui/Card';

/**
 * There is no authenticated "change password while logged in" service —
 * only `authService.forgotPassword`. Rather than inventing a new backend
 * capability, this entry point reuses the existing, already-approved
 * Forgot Password flow (Phase 2).
 */
export function ChangePasswordEntryPoint() {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-inv-display font-bold text-inv-ink-900">الأمان</h2>
      </CardHeader>
      <CardBody>
        <Link
          to="/innovator/forgot-password"
          className="flex items-center justify-between gap-3 rounded-inv-control border border-inv-ink-100 px-4 py-3 hover:bg-inv-ink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700"
        >
          <span className="flex items-center gap-2.5 text-sm text-inv-ink-900">
            <KeyRound className="size-4 text-inv-ink-500" aria-hidden="true" />
            تغيير كلمة المرور
          </span>
          <ChevronLeft className="size-4 text-inv-ink-400" aria-hidden="true" />
        </Link>
      </CardBody>
    </Card>
  );
}
