import Link from "next/link";
import { Building2, CheckCircle2, XCircle, ShieldCheck, ArrowLeft } from "lucide-react";
import { getPlatformStatsAction } from "@/lib/server/actions/platform-oversight";
import { PageHeader, Card, StatCard } from "@/components/ui/layout-bits";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboardPage() {
  const result = await getPlatformStatsAction();
  const stats = result.ok ? result.data : null;

  return (
    <div>
      <PageHeader
        title="لوحة تحكم مسؤول المنصة"
        description="إحصاءات إجمالية على مستوى المنصة فقط — لا يعرض هذا القسم أفكار أو مشاريع أو تقييمات أي مؤسسة."
      />
      {!result.ok && (
        <Card className="mb-5 border-[var(--color-danger)]/30 text-sm text-[var(--color-danger)]">
          تعذر تحميل الإحصاءات: {result.message}
        </Card>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالي المؤسسات" value={stats?.organizationCount ?? "—"} icon={Building2} tone="primary" />
        <StatCard label="المؤسسات النشطة" value={stats?.activeOrganizationCount ?? "—"} icon={CheckCircle2} tone="success" />
        <StatCard label="المؤسسات الموقوفة" value={stats?.suspendedOrganizationCount ?? "—"} icon={XCircle} tone="danger" />
        <StatCard label="عدد مسؤولي المنصة" value={stats?.platformAdminCount ?? "—"} icon={ShieldCheck} tone="beacon" />
      </div>
      <div className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/super-admin/organizations"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          عرض جميع المؤسسات
          <ArrowLeft size={14} />
        </Link>
        <Link
          href="/super-admin/audit"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          عرض سجل النشاط
          <ArrowLeft size={14} />
        </Link>
      </div>
    </div>
  );
}
