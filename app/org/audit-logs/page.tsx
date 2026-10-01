"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { SearchInput, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AuditLog } from "@/lib/types";
import { getCurrentOrgSession } from "@/lib/client/org-ideas";
import { fetchOrgAuditLogs } from "@/lib/client/org-audit-logs";

// Phase 6 — real audit logs (lib/client/org-audit-logs.ts), scoped
// server-side to the authenticated actor's organization via requirePermission
// (AUDIT, VIEW). Previously this page rendered lib/store.tsx's mock
// d.auditLogs; the table/columns/filters are unchanged, only the data source
// and loading/error/empty handling are new.
export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    return fetchOrgAuditLogs(organizationId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((items) => {
        if (cancelled) return;
        setLogs(items);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const retry = () => {
    setLoadState("loading");
    setReloadKey((k) => k + 1);
  };

  const entities = useMemo(() => [...new Set(logs.map((l) => l.entityType))], [logs]);
  const rows = useMemo(
    () =>
      logs.filter(
        (l) =>
          (!search ||
            `${l.userName} ${l.actionAr} ${l.entityId}`.toLowerCase().includes(search.toLowerCase())) &&
          (!entity || l.entityType === entity)
      ),
    [logs, search, entity]
  );

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل سجل التدقيق..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل سجل التدقيق"
        description="حدث خطأ أثناء الاتصال بالخادم."
        action={
          <Button variant="outline" onClick={retry}>
            إعادة المحاولة
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="سجل التدقيق"
        description="سجل غير قابل للتعديل للمستخدم والإجراء والكيان والوقت والجهاز/IP، مع Before/After والصلاحيات والمشاهدات الحساسة."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <SearchInput value={search} onChange={setSearch} />
        <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">كل الكيانات</option>
          {entities.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="لا توجد سجلات" description="لم يتم تسجيل أي إجراءات مطابقة بعد." />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="border-b text-right text-xs">
                  <th className="p-3">الوقت</th>
                  <th>المستخدم</th>
                  <th>الإجراء</th>
                  <th>الكيان</th>
                  <th>قبل</th>
                  <th>بعد</th>
                  <th>الصلاحية</th>
                  <th>تفاصيل حساسة/قرار</th>
                  <th>مرفقات</th>
                  <th>جهاز / IP</th>
                  <th>حساس</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-b">
                    <td className="p-3">{new Date(l.timestamp).toLocaleString("ar-SA")}</td>
                    <td>{l.userName}</td>
                    <td>
                      <b>{l.actionAr}</b>
                    </td>
                    <td>
                      {l.entityType} · {l.entityId}
                    </td>
                    <td className="max-w-[180px] truncate">{l.previousState ?? "—"}</td>
                    <td className="max-w-[180px] truncate">{l.newState ?? "—"}</td>
                    <td>{l.permissionSnapshot ?? "—"}</td>
                    <td>{l.decisionDetails ?? "—"}</td>
                    <td>{l.attachmentIds?.length ?? 0}</td>
                    <td>
                      {l.device}
                      <br />
                      <small>{l.ipAddress}</small>
                    </td>
                    <td>{l.sensitiveView ? <Badge tone="warning">مشاهدة حساسة</Badge> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t p-3 text-xs text-[var(--color-ink-soft)]">
            هذا السجل للقراءة فقط ولا يوفر أي إجراء تعديل أو حذف.
          </div>
        </Card>
      )}
    </div>
  );
}
