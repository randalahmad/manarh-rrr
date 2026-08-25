import Link from "next/link";
import { getPlatformStatsAction } from "@/lib/server/actions/platform-oversight";
import { PageHeader, Card } from "@/components/ui/layout-bits";

export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Card>
      <p className="text-xs text-[var(--color-ink-soft)]">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-[var(--color-ink)]">{value ?? "—"}</p>
    </Card>
  );
}

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
        <StatCard label="إجمالي المؤسسات" value={stats?.organizationCount} />
        <StatCard label="المؤسسات النشطة" value={stats?.activeOrganizationCount} />
        <StatCard label="المؤسسات الموقوفة" value={stats?.suspendedOrganizationCount} />
        <StatCard label="عدد مسؤولي المنصة" value={stats?.platformAdminCount} />
      </div>
      <div className="mt-6 flex flex-wrap gap-4">
        <Link href="/super-admin/organizations" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          عرض جميع المؤسسات ←
        </Link>
        <Link href="/super-admin/audit" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          عرض سجل النشاط ←
        </Link>
      </div>
    </div>
  );
}
