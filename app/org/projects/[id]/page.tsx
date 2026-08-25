"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppData } from "@/lib/store";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { FormField, Input, Select, Textarea } from "@/components/ui/form";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE } from "@/lib/utils";
import type {
  Project,
  ProjectStatus,
  RiskLevel,
  ProjectRequirement,
  ProjectMember,
  ProjectDocument,
  ProjectUpdate,
  ProjectTask,
  ProjectRisk,
  KPI,
  ImpactMeasurement,
} from "@/lib/types";
import { fetchOrgIdea, fetchUserNames } from "@/lib/client/org-ideas";
import { fetchOrgProject, transitionProject } from "@/lib/client/org-projects";
import {
  fetchProjectRequirements,
  fetchProjectMembers,
  fetchProjectDocuments,
  fetchProjectUpdates,
  fetchProjectTasks,
  createProjectTask,
  fetchProjectRisks,
  createProjectRisk,
  fetchProjectKpis,
  createProjectKpi,
  fetchProjectImpactMeasurements,
  createProjectImpactMeasurement,
} from "@/lib/client/org-project-resources";
import { allowedProjectTransitions } from "@/lib/server/workflow/project-status";

// Project Core — Phase 6, Group D. The project itself (overview, metrics,
// status) and the status-transition controls are real, enforcing the
// canonical 15-status workflow server-side (lib/server/workflow/project-status.ts)
// via buttons rendered only for allowedProjectTransitions — the same
// pattern already used on the Idea detail page — instead of the old mock's
// unguarded 15-option <select>.
//
// Project Sub-resources — Phase 6, Group E. Requirements/team/docs/updates
// are real reads only (the mock UI never had a create affordance for these
// four, so per "do not redesign the UI" only their reads are wired — see
// lib/client/org-project-resources.ts's header). Tasks/risks/kpi/impact are
// real reads AND real creates through their existing "add" modals, which now
// call the real Server Actions instead of the mock store's addProjectTask/
// addRisk/addKPI/addImpact. There is no Org Admin milestones tab to wire.
// The "decisions" tab (project-level decisions) and "budget" tab (no
// sub-resource of its own — reads straight off the real project) are
// unaffected by Group E scope. The strategic-goal/challenge-opportunity
// lookups in "overview" are Group F/G scope and stay on the mock store.
export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const d = useAppData();

  const [p, setP] = useState<Project | null>(null);
  const [ownerName, setOwnerName] = useState<string>();
  const [ideaTitle, setIdeaTitle] = useState<string>();
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [transitioningTo, setTransitioningTo] = useState<ProjectStatus | null>(null);

  // Project Sub-resources — Phase 6, Group E. Real reads for all ten tabs;
  // requirements/team/docs/updates have no create UI to wire (see header
  // comment above), tasks/risks/kpi/impact also get real creates below.
  const [reqs, setReqs] = useState<ProjectRequirement[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [impacts, setImpacts] = useState<ImpactMeasurement[]>([]);

  const [tab, setTab] = useState("overview");
  const [taskOpen, setTaskOpen] = useState(false);
  const [riskOpen, setRiskOpen] = useState(false);
  const [kpiOpen, setKpiOpen] = useState(false);
  const [impactOpen, setImpactOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [riskTitle, setRiskTitle] = useState("");
  const [riskDesc, setRiskDesc] = useState("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("MEDIUM");
  const [kpiName, setKpiName] = useState("");
  const [target, setTarget] = useState("100");
  const [current, setCurrent] = useState("0");
  const [impactDesc, setImpactDesc] = useState("");
  const [impactVal, setImpactVal] = useState("0");

  const loadProjectData = useCallback(async (projectId: string) => {
    const project = await fetchOrgProject(projectId);
    const [names, idea, reqRows, memberRows, docRows, updateRows, taskRows, riskRows, kpiRows, impactRows] = await Promise.all([
      fetchUserNames([project.ownerId]),
      fetchOrgIdea(project.ideaId).catch(() => null),
      fetchProjectRequirements(projectId),
      fetchProjectMembers(projectId),
      fetchProjectDocuments(projectId),
      fetchProjectUpdates(projectId),
      fetchProjectTasks(projectId),
      fetchProjectRisks(projectId),
      fetchProjectKpis(projectId),
      fetchProjectImpactMeasurements(projectId),
    ]);
    return {
      project,
      ownerName: names.get(project.ownerId),
      ideaTitle: idea?.title,
      reqRows,
      memberRows,
      docRows,
      updateRows,
      taskRows,
      riskRows,
      kpiRows,
      impactRows,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadProjectData(id)
      .then((data) => {
        if (cancelled) return;
        setP(data.project);
        setOwnerName(data.ownerName);
        setIdeaTitle(data.ideaTitle);
        setReqs(data.reqRows);
        setMembers(data.memberRows);
        setDocs(data.docRows);
        setUpdates(data.updateRows);
        setTasks(data.taskRows);
        setRisks(data.riskRows);
        setKpis(data.kpiRows);
        setImpacts(data.impactRows);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey, loadProjectData]);

  const retry = () => {
    setLoadState("loading");
    setReloadKey((k) => k + 1);
  };

  const allowed = useMemo(
    () => (p ? allowedProjectTransitions(p.status, p.previousActiveStatus ?? null) : []),
    [p]
  );

  const handleTransition = async (status: ProjectStatus) => {
    setTransitioningTo(status);
    try {
      await transitionProject(id, status);
    } finally {
      setReloadKey((k) => k + 1);
      setTransitioningTo(null);
    }
  };

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل المشروع..." />;
  if (loadState === "error" || !p) {
    return (
      <EmptyState
        title="تعذر تحميل المشروع"
        description="حدث خطأ أثناء الاتصال بالخادم، أو أن المشروع غير موجود."
        action={<Button variant="outline" onClick={retry}>إعادة المحاولة</Button>}
      />
    );
  }

  const projectDecisions = d.decisions.filter((x) => x.projectId === id);

  return (
    <div>
      <PageHeader
        title={p.name}
        description="إدارة متكاملة للمشروع: المتطلبات، الفريق، المهام، المخاطر، المؤشرات، الميزانية، القرارات والأثر."
        breadcrumbs={[{ label: "المشاريع", href: "/org/projects" }, { label: p.name }]}
        actions={<Badge tone={PROJECT_STATUS_TONE[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</Badge>}
      />
      {allowed.length > 0 && (
        <Card className="mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <b className="ml-2">الإجراءات المتاحة حسب Workflow:</b>
            {allowed.map((st) => (
              <Button
                key={st}
                size="sm"
                variant="outline"
                disabled={transitioningTo !== null}
                onClick={() => handleTransition(st)}
              >
                {transitioningTo === st ? "جارٍ التنفيذ..." : PROJECT_STATUS_LABELS[st]}
              </Button>
            ))}
          </div>
        </Card>
      )}
      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Metric l="الإنجاز" v={`${p.progress}%`} />
          <Metric l="الميزانية" v={`${p.budget ?? 0}`} />
          <Metric l="خط الأساس" v={`${p.baseline ?? 0}`} />
          <Metric l="التكلفة الفعلية" v={`${p.actualCost ?? 0}`} />
          <Metric l="المالك" v={ownerName ?? "—"} />
          <Metric l="الفكرة الأصلية" v={ideaTitle ?? "—"} />
        </div>
      </Card>
      <Tabs
        tabs={[
          { id: "overview", label: "نظرة عامة" },
          { id: "requirements", label: "المتطلبات", count: reqs.length },
          { id: "team", label: "الفريق", count: members.length },
          { id: "tasks", label: "المهام", count: tasks.length },
          { id: "risks", label: "المخاطر والمعوقات", count: risks.length },
          { id: "kpi", label: "المؤشرات", count: kpis.length },
          { id: "budget", label: "الميزانية" },
          { id: "decisions", label: "القرارات", count: projectDecisions.length },
          { id: "docs", label: "المرفقات", count: docs.length },
          { id: "updates", label: "التحديثات", count: updates.length },
          { id: "impact", label: "الأثر", count: impacts.length },
        ]}
        defaultTab="overview"
        onChange={setTab}
      />
      <div className="mt-4">
        {tab === "overview" && (
          <Card>
            <p>{p.description}</p>
            <div className="mt-4 text-sm">الهدف الاستراتيجي: {p.strategicGoalIds?.map((g) => d.strategicGoals.find((x) => x.id === g)?.name).filter(Boolean).join("، ") || "—"}</div>
            <div className="mt-2 text-sm">التحدي/الفرصة: {d.challenges.find((x) => x.id === p.challengeId)?.title ?? d.opportunities.find((x) => x.id === p.opportunityId)?.title ?? "—"}</div>
          </Card>
        )}
        {tab === "requirements" && <Card>{reqs.map((r) => <div key={r.id} className="border-b p-3"><b>{r.title}</b><div className="text-xs">{r.status} · {r.dueDate ? new Date(r.dueDate).toLocaleDateString("ar-SA") : ""}</div></div>)}</Card>}
        {tab === "team" && <Card>{members.map((m) => <div key={m.id} className="border-b p-3">{d.users.find((u) => u.id === m.userId)?.fullName} · {m.roleInProject}</div>)}</Card>}
        {tab === "tasks" && (
          <Card>
            <Button className="mb-3" onClick={() => setTaskOpen(true)}>إضافة مهمة</Button>
            {tasks.map((t) => (
              <div key={t.id} className="flex justify-between border-b p-3">
                <span><b>{t.title}</b><small className="block">{d.users.find((u) => u.id === t.assigneeId)?.fullName}</small></span>
                <Badge tone={t.status === "BLOCKED" ? "danger" : t.status === "DONE" ? "success" : "warning"}>{t.status}</Badge>
              </div>
            ))}
          </Card>
        )}
        {tab === "risks" && (
          <Card>
            <Button className="mb-3" onClick={() => setRiskOpen(true)}>إضافة خطر/معوق</Button>
            {risks.map((r) => (
              <div key={r.id} className="border-b p-3">
                <div className="flex justify-between"><b>{r.title}</b><Badge tone={r.level === "CRITICAL" ? "danger" : "warning"}>{r.level}</Badge></div>
                <p className="text-sm">{r.description}</p>
                <small>{r.blocker ? "معوق تنفيذي · " : ""}{r.mitigationPlan ?? ""}</small>
              </div>
            ))}
          </Card>
        )}
        {tab === "kpi" && (
          <Card>
            <Button className="mb-3" onClick={() => setKpiOpen(true)}>إضافة مؤشر</Button>
            {kpis.map((k) => (
              <div key={k.id} className="border-b p-3">
                <b>{k.name}</b>
                <div className="text-sm">الأساس {k.baselineValue ?? 0} · المستهدف {k.targetValue} · الحالي {k.currentValue} {k.unit}</div>
              </div>
            ))}
          </Card>
        )}
        {tab === "budget" && (
          <Card>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric l="الميزانية المعتمدة" v={`${p.budget ?? 0}`} />
              <Metric l="خط الأساس" v={`${p.baseline ?? 0}`} />
              <Metric l="التكلفة الفعلية" v={`${p.actualCost ?? 0}`} />
            </div>
          </Card>
        )}
        {tab === "decisions" && <Card>{projectDecisions.length ? projectDecisions.map((x) => <div key={x.id} className="border-b p-3"><b>{x.decisionType}</b><p>{x.reason}</p></div>) : <p className="text-sm text-[var(--color-ink-soft)]">لا توجد قرارات مشروع مستقلة مسجلة.</p>}</Card>}
        {tab === "docs" && <Card>{docs.length ? docs.map((a) => <div key={a.id} className="border-b p-3">{a.fileName} · {a.sizeKb} KB</div>) : <p>لا توجد مرفقات مشروع.</p>}</Card>}
        {tab === "updates" && <Card>{updates.map((u) => <div key={u.id} className="border-b p-3"><b>{u.updateType}</b><p>{u.content}</p><small>{new Date(u.createdAt).toLocaleString("ar-SA")}</small></div>)}</Card>}
        {tab === "impact" && (
          <Card>
            <Button className="mb-3" onClick={() => setImpactOpen(true)}>إضافة قياس أثر</Button>
            {impacts.map((m) => <div key={m.id} className="border-b p-3"><b>{m.description}</b><div>{m.actualValue ?? "—"} {m.unit}</div></div>)}
          </Card>
        )}
      </div>
      <Modal open={taskOpen} onClose={() => setTaskOpen(false)} title="إضافة مهمة" footer={<Button onClick={async () => { if (!taskTitle) return; await createProjectTask({ projectId: p.id, title: taskTitle, assigneeId: assignee || undefined }); setTaskTitle(""); setAssignee(""); setTaskOpen(false); setReloadKey((k) => k + 1); }}>حفظ</Button>}>
        <div className="space-y-3">
          <FormField label="المهمة"><Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} /></FormField>
          <FormField label="المسؤول"><Select value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">بدون</option>{d.users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}</Select></FormField>
        </div>
      </Modal>
      <Modal open={riskOpen} onClose={() => setRiskOpen(false)} title="إضافة خطر أو معوق" footer={<Button onClick={async () => { if (!riskTitle) return; await createProjectRisk({ projectId: p.id, title: riskTitle, description: riskDesc, level: riskLevel, blocker: riskLevel === "CRITICAL" }); setRiskTitle(""); setRiskDesc(""); setRiskLevel("MEDIUM"); setRiskOpen(false); setReloadKey((k) => k + 1); }}>حفظ</Button>}>
        <div className="space-y-3">
          <FormField label="العنوان"><Input value={riskTitle} onChange={(e) => setRiskTitle(e.target.value)} /></FormField>
          <FormField label="الوصف"><Textarea value={riskDesc} onChange={(e) => setRiskDesc(e.target.value)} /></FormField>
          <FormField label="المستوى"><Select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></Select></FormField>
        </div>
      </Modal>
      <Modal open={kpiOpen} onClose={() => setKpiOpen(false)} title="إضافة KPI" footer={<Button onClick={async () => { if (!kpiName) return; await createProjectKpi({ projectId: p.id, name: kpiName, unit: "%", targetValue: Number(target), currentValue: Number(current), ownerId: p.ownerId }); setKpiName(""); setTarget("100"); setCurrent("0"); setKpiOpen(false); setReloadKey((k) => k + 1); }}>حفظ</Button>}>
        <div className="space-y-3">
          <FormField label="المؤشر"><Input value={kpiName} onChange={(e) => setKpiName(e.target.value)} /></FormField>
          <FormField label="المستهدف"><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></FormField>
          <FormField label="الحالي"><Input type="number" value={current} onChange={(e) => setCurrent(e.target.value)} /></FormField>
        </div>
      </Modal>
      <Modal open={impactOpen} onClose={() => setImpactOpen(false)} title="إضافة قياس أثر" footer={<Button onClick={async () => { if (!impactDesc) return; await createProjectImpactMeasurement({ projectId: p.id, type: "OPERATIONAL", description: impactDesc, actualValue: Number(impactVal), unit: "%" }); setImpactDesc(""); setImpactVal("0"); setImpactOpen(false); setReloadKey((k) => k + 1); }}>حفظ</Button>}>
        <div className="space-y-3">
          <FormField label="الوصف"><Input value={impactDesc} onChange={(e) => setImpactDesc(e.target.value)} /></FormField>
          <FormField label="القيمة الفعلية"><Input type="number" value={impactVal} onChange={(e) => setImpactVal(e.target.value)} /></FormField>
        </div>
      </Modal>
    </div>
  );
}
function Metric({ l, v }: { l: string; v: string }) {
  return <div className="rounded-lg bg-[var(--color-surface-sunken)] p-3 text-center"><b className="block">{v}</b><span className="text-xs text-[var(--color-ink-soft)]">{l}</span></div>;
}
