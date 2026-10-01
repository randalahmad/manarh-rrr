"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookMarked } from "lucide-react";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentOrgSession, fetchOrgIdeas } from "@/lib/client/org-ideas";
import { fetchOrgProjects } from "@/lib/client/org-projects";
import { fetchOrgInnovationRegister } from "@/lib/client/org-innovation-register";
import type { InnovationRecord, Idea, Project } from "@/lib/types";

// Real, org-wide listing (lib/client/org-innovation-register.ts, backed by
// a new REPORT:VIEW-gated read) replacing the previous lib/store.tsx mock.
export default function InnovationRegister() {
  const [records, setRecords] = useState<InnovationRecord[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    const [recordsData, ideasData, projectsData] = await Promise.all([
      fetchOrgInnovationRegister(organizationId),
      fetchOrgIdeas(organizationId),
      fetchOrgProjects(organizationId),
    ]);
    return { recordsData, ideasData, projectsData };
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then(({ recordsData, ideasData, projectsData }) => {
        if (cancelled) return;
        setRecords(recordsData);
        setIdeas(ideasData);
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

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل سجل الابتكار..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل سجل الابتكار"
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
      <PageHeader title="سجل الابتكار المؤسسي" description="السجل النهائي للأفكار ونتائجها والمشاريع الناتجة والأثر الموثق." />
      {records.length === 0 ? (
        <EmptyState icon={BookMarked} title="لا توجد سجلات بعد" description="ستظهر هنا الأفكار التي وصلت لحالة نهائية." />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b text-right text-xs">
                  <th className="p-3">الفكرة</th>
                  <th>المشروع</th>
                  <th>الحالة النهائية</th>
                  <th>الأثر</th>
                  <th>النتيجة</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-3">
                      <Link className="font-medium text-[var(--color-primary)] hover:underline" href={`/org/ideas/${r.ideaId}`}>
                        {ideas.find((i) => i.id === r.ideaId)?.title ?? "—"}
                      </Link>
                    </td>
                    <td className="text-[var(--color-ink)]">
                      {r.projectId ? (
                        <Link className="text-[var(--color-primary)] hover:underline" href={`/org/projects/${r.projectId}`}>
                          {projects.find((p) => p.id === r.projectId)?.name ?? "—"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <Badge tone="primary">{r.finalStatus}</Badge>
                    </td>
                    <td className="text-[var(--color-ink)]">{r.impactMeasurementIds.length}</td>
                    <td className="text-[var(--color-ink)]">{r.outcome ?? "—"}</td>
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
