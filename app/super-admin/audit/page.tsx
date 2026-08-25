import { listPlatformAuditLogsAction } from "@/lib/server/actions/platform-audit";
import { PageHeader, Card } from "@/components/ui/layout-bits";
import { formatDateTime } from "@/lib/utils";

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
      ) : result.data.length === 0 ? (
        <Card className="text-sm text-[var(--color-ink-soft)]">لا يوجد نشاط مسجّل بعد.</Card>
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-soft)] text-right text-xs text-[var(--color-ink-soft)]">
                  <th className="px-4 py-3 font-medium">الإجراء</th>
                  <th className="px-4 py-3 font-medium">بواسطة</th>
                  <th className="px-4 py-3 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--color-border-soft)] last:border-0">
                    <td className="px-4 py-3 text-[var(--color-ink)]">{log.action_ar}</td>
                    <td className="px-4 py-3 text-[var(--color-ink-soft)]">{log.user_name}</td>
                    <td className="px-4 py-3 text-[var(--color-ink-soft)]">{formatDateTime(log.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
