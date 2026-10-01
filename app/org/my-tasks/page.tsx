"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ListTodo } from "lucide-react";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentOrgSession } from "@/lib/client/org-ideas";
import { fetchOrgProjects } from "@/lib/client/org-projects";
import { fetchOrgTasks } from "@/lib/client/org-tasks";
import type { ProjectTask, Project } from "@/lib/types";

// Real, org-wide listing (lib/client/org-tasks.ts, backed by a new
// membership-gated aggregate query mirroring listTasksForProject's own
// posture) replacing the previous lib/store.tsx mock. This page is
// exclusively under the Org Admin section, so — matching the mock's own
// "ORG_ADMIN sees every task" branch — every org task is shown here, not
// just ones assigned to the viewer.
export default function MyTasksPage() {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    const [tasksData, projectsData] = await Promise.all([fetchOrgTasks(organizationId), fetchOrgProjects(organizationId)]);
    return { tasksData, projectsData };
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then(({ tasksData, projectsData }) => {
        if (cancelled) return;
        setTasks(tasksData);
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

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل المهام..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل المهام"
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
      <PageHeader title="مهامي" description="كل المهام والإجراءات التنفيذية عبر مشاريع الجهة." />
      {tasks.length === 0 ? (
        <EmptyState icon={ListTodo} title="لا توجد مهام بعد" description="ستظهر هنا المهام بمجرد إضافتها على أي مشروع." />
      ) : (
        <Card padded={false}>
          <div className="divide-y divide-[var(--color-border-soft)]">
            {tasks.map((t) => {
              const p = projects.find((x) => x.id === t.projectId);
              const overdue = !!t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE";
              return (
                <Link
                  href={`/org/projects/${t.projectId}`}
                  key={t.id}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-[var(--color-surface-sunken)]"
                >
                  <div>
                    <b className="text-[var(--color-ink)]">{t.title}</b>
                    <div className="text-xs text-[var(--color-ink-soft)]">{p?.name ?? "—"}</div>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone={overdue ? "danger" : "neutral"}>{overdue ? "متأخرة" : t.priority}</Badge>
                    <Badge tone={t.status === "DONE" ? "success" : "warning"}>{t.status}</Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
