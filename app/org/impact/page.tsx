"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Banknote, Gauge } from "lucide-react";
import { PageHeader, Card, StatCard, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { getCurrentOrgSession, fetchOrgIdeas } from "@/lib/client/org-ideas";
import { fetchOrgProjects } from "@/lib/client/org-projects";
import { fetchOrgImpactMeasurements } from "@/lib/client/org-impact";
import type { ImpactMeasurement, Idea, Project } from "@/lib/types";

// Real, org-wide listing (lib/client/org-impact.ts, backed by a new
// IMPACT:VIEW-gated aggregate query) replacing the previous lib/store.tsx mock.
export default function ImpactPage() {
  const [measurements, setMeasurements] = useState<ImpactMeasurement[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    const [measurementsData, ideasData, projectsData] = await Promise.all([
      fetchOrgImpactMeasurements(organizationId),
      fetchOrgIdeas(organizationId),
      fetchOrgProjects(organizationId),
    ]);
    return { measurementsData, ideasData, projectsData };
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then(({ measurementsData, ideasData, projectsData }) => {
        if (cancelled) return;
        setMeasurements(measurementsData);
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

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل قياسات الأثر..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل قياسات الأثر"
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
      <PageHeader title="قياس الأثر" description="توثيق الأثر المالي والتشغيلي والاستراتيجي وربطه بالأفكار والمشاريع." />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="قياسات الأثر" value={measurements.length} icon={Activity} />
        <StatCard
          label="مشاريع لها أثر موثق"
          value={new Set(measurements.map((x) => x.projectId).filter(Boolean)).size}
          icon={Gauge}
        />
        <StatCard label="قياسات مالية" value={measurements.filter((x) => x.type === "FINANCIAL").length} icon={Banknote} />
      </div>
      {measurements.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={Activity} title="لا توجد قياسات أثر بعد" description="ستظهر هنا قياسات الأثر بمجرد توثيقها." />
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {measurements.map((m) => (
            <Card key={m.id}>
              <div className="flex justify-between">
                <div>
                  <b className="text-[var(--color-ink)]">{m.description}</b>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                    {projects.find((p) => p.id === m.projectId)?.name ?? ideas.find((i) => i.id === m.ideaId)?.title ?? "—"}
                  </p>
                </div>
                <b className="text-[var(--color-ink)]">
                  {m.actualValue ?? "—"} {m.unit}
                </b>
              </div>
              <div className="mt-3 text-xs text-[var(--color-ink-soft)]">
                خط الأساس: {m.baselineValue ?? "—"} · المستهدف: {m.targetValue ?? "—"} · النوع: {m.type}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
