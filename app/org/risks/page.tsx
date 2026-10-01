"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getCurrentOrgSession } from "@/lib/client/org-ideas";
import { fetchOrgProjects } from "@/lib/client/org-projects";
import { fetchOrgRisks, closeOrgRisk } from "@/lib/client/org-risks";
import type { ProjectRisk, Project } from "@/lib/types";

// Real, org-wide listing (lib/client/org-risks.ts, backed by a new
// RISK:VIEW-gated aggregate query) replacing the previous lib/store.tsx
// mock. "إغلاق" reuses the existing, unmodified updateRiskAction.
export default function RisksPage() {
  const { show } = useToast();
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [closingId, setClosingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    const [risksData, projectsData] = await Promise.all([fetchOrgRisks(organizationId), fetchOrgProjects(organizationId)]);
    return { risksData, projectsData };
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then(({ risksData, projectsData }) => {
        if (cancelled) return;
        setRisks(risksData);
        setProjects(projectsData);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const close = async (id: string) => {
    setClosingId(id);
    try {
      const updated = await closeOrgRisk(id);
      setRisks((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      show(err instanceof Error ? err.message : "تعذر إغلاق الخطر", "danger");
    } finally {
      setClosingId(null);
    }
  };

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل المخاطر..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل المخاطر"
        description="حدث خطأ أثناء الاتصال بالخادم."
        action={
          <Button
            variant="outline"
            onClick={() => {
              setLoadState("loading");
              setReloadKey((k) => k + 1);
            }}
          >
            إعادة المحاولة
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader title="المخاطر والمعوقات" description="سجل موحد لمخاطر ومعوقات المشاريع وخطط المعالجة والمالك والحالة." />
      {risks.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="لا توجد مخاطر مسجّلة" description="ستظهر هنا المخاطر والمعوقات بمجرد تسجيلها على أي مشروع." />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-right text-xs">
                  <th className="p-3">الخطر/المعوق</th>
                  <th>المشروع</th>
                  <th>المستوى</th>
                  <th>الحالة</th>
                  <th>خطة المعالجة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-3 text-[var(--color-ink)]">
                      <b>{r.title}</b>
                      <div className="text-xs text-[var(--color-ink-soft)]">{r.blocker ? "معوق تنفيذي" : "خطر"}</div>
                    </td>
                    <td>
                      <Link className="text-[var(--color-primary)] hover:underline" href={`/org/projects/${r.projectId}`}>
                        {projects.find((p) => p.id === r.projectId)?.name ?? "—"}
                      </Link>
                    </td>
                    <td>
                      <Badge tone={r.level === "CRITICAL" || r.level === "HIGH" ? "danger" : "warning"}>{r.level}</Badge>
                    </td>
                    <td className="text-[var(--color-ink)]">{r.status}</td>
                    <td className="text-[var(--color-ink)]">{r.mitigationPlan ?? "—"}</td>
                    <td>
                      {r.status !== "CLOSED" && (
                        <Button size="sm" variant="outline" loading={closingId === r.id} onClick={() => close(r.id)}>
                          إغلاق
                        </Button>
                      )}
                    </td>
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
