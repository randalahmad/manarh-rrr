import { listPlatformAuditLogsAction } from "@/lib/server/actions/platform-audit";
import { PageHeader, Card } from "@/components/ui/layout-bits";
import { AuditLogTable } from "@/components/super-admin/audit-log-table";

export const dynamic = "force-dynamic";

export default async function PlatformAuditPage() {
  const result = await listPlatformAuditLogsAction();

  return (
    <div>
      <PageHeader
        title="سجل نشاط المنصة"
        description="إجراءات مسؤولي المنصة فقط (إنشاء/إيقاف/إعادة تفعيل مؤسسة، تعيين أول مسؤول) — لا يعرض هذا السجل محتوى المؤسسات الداخلي."
      />
      {!result.ok ? (
        <Card className="text-sm text-[var(--color-danger)]">تعذر تحميل سجل النشاط: {result.message}</Card>
      ) : (
        <AuditLogTable logs={result.data} />
      )}
    </div>
  );
}
