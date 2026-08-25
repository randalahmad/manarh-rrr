"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAppData } from "@/lib/store";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField, Input, Select, Textarea } from "@/components/ui/form";
import { DECISION_TYPE_LABELS } from "@/lib/utils";
import type { DecisionType, Idea, Evaluation, Recommendation, Decision, Project } from "@/lib/types";
import { fetchOrgIdea } from "@/lib/client/org-ideas";
import { fetchEvaluationsForIdea, fetchRecommendationsForIdea, fetchDecisionsForIdea, makeDecision as makeDecisionRequest } from "@/lib/client/org-evaluations";
import { fetchOrgProject, fetchProjectOwnerCandidates, createProjectFromIdea } from "@/lib/client/org-projects";
import type { ProjectOwnerCandidate } from "@/lib/server/services/projects";

// Decision — Phase 6, Group C. The idea, its evaluations, its most recent
// recommendation, and its decision (if any) are all real. Project
// conversion is real as of Phase 6, Group D: the "تحويل إلى مشروع" button
// opens a modal (owner picker, dates) that calls createProjectFromIdea
// (createProjectFromIdeaAction server-side), which enforces the real
// idea-status precondition and UNIQUE(projects.idea_id) — see
// lib/server/services/projects.ts.
type LoadedData = {
  idea: Idea;
  evaluations: Evaluation[];
  recommendation: Recommendation | null;
  decision: Decision | null;
  project: Project | null;
  ownerCandidates: ProjectOwnerCandidate[];
};

export default function DecisionDetail() {
  const { id } = useParams<{ id: string }>();
  const d = useAppData();

  const [data, setData] = useState<LoadedData | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async (ideaId: string): Promise<LoadedData> => {
    const idea = await fetchOrgIdea(ideaId);
    const [evaluations, recommendations, decisions, project, ownerCandidates] = await Promise.all([
      fetchEvaluationsForIdea(ideaId),
      fetchRecommendationsForIdea(ideaId),
      fetchDecisionsForIdea(ideaId),
      idea.projectId ? fetchOrgProject(idea.projectId).catch(() => null) : Promise.resolve(null),
      fetchProjectOwnerCandidates(idea.organizationId).catch(() => []),
    ]);
    return {
      idea,
      evaluations,
      recommendation: recommendations[0] ?? null,
      decision: decisions[0] ?? null,
      project,
      ownerCandidates,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadData(id)
      .then((loaded) => {
        if (cancelled) return;
        setData(loaded);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id, loadData, reloadKey]);

  const retry = () => {
    setLoadState("loading");
    setReloadKey((k) => k + 1);
  };

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DecisionType>("APPROVE");
  const [reason, setReason] = useState("");
  const [conditions, setConditions] = useState("");
  const [isDeciding, setIsDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState("");

  const [convertOpen, setConvertOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectOwner, setProjectOwner] = useState("");
  const [projectStart, setProjectStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [projectEnd, setProjectEnd] = useState(() => new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10));
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState("");

  const handleDecide = async () => {
    if (!reason.trim()) return;
    setIsDeciding(true);
    setDecisionError("");
    try {
      await makeDecisionRequest({
        ideaId: id,
        decisionType: type,
        reason,
        conditions: type === "CONDITIONALLY_APPROVE" ? conditions || undefined : undefined,
      });
      setOpen(false);
      setReason("");
      setConditions("");
      const loaded = await loadData(id);
      setData(loaded);
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : "تعذر حفظ القرار.");
    } finally {
      setIsDeciding(false);
    }
  };

  const openConvert = () => {
    setProjectName(data?.idea.title ?? "");
    setConvertError("");
    setConvertOpen(true);
  };

  const handleConvert = async () => {
    if (!data || !projectOwner || !projectName.trim()) return;
    setIsConverting(true);
    setConvertError("");
    try {
      await createProjectFromIdea({
        organizationId: data.idea.organizationId,
        ideaId: data.idea.id,
        name: projectName,
        description: data.idea.description,
        ownerId: projectOwner,
        startDate: new Date(projectStart).toISOString(),
        expectedCompletionDate: new Date(projectEnd).toISOString(),
      });
      setConvertOpen(false);
      const loaded = await loadData(id);
      setData(loaded);
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : "تعذر إنشاء المشروع.");
    } finally {
      setIsConverting(false);
    }
  };

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل الفكرة..." />;
  if (loadState === "error" || !data) {
    return (
      <EmptyState
        title="تعذر تحميل الفكرة"
        description="حدث خطأ أثناء الاتصال بالخادم، أو أن الفكرة غير موجودة."
        action={<Button variant="outline" onClick={retry}>إعادة المحاولة</Button>}
      />
    );
  }

  const { idea, evaluations, recommendation, decision, project, ownerCandidates } = data;
  const avg = evaluations.length
    ? evaluations.reduce((s, e) => s + (e.strategicAlignmentScore + e.feasibilityScore + e.resourceReadinessScore) / 3, 0) / evaluations.length
    : 0;
  const canConvert = decision && ["APPROVE", "CONDITIONALLY_APPROVE", "CONVERT_TO_PROJECT"].includes(decision.decisionType) && !project;

  return (
    <div>
      <PageHeader
        title={`قرار الجهة: ${idea.title}`}
        description="قرار موثق مع سبب/شروط وملاحظات وإشعار، وربط مباشر بتحويل الفكرة إلى مشروع."
        actions={!decision && d.can("GOVERNANCE", "APPROVE") ? <Button onClick={() => setOpen(true)}>اتخاذ القرار</Button> : undefined}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold">ملخص الفكرة</h2>
          <p className="mt-2 text-sm">{idea.description}</p>
          <Link className="mt-3 inline-block text-sm text-[var(--color-primary)]" href={`/org/ideas/${id}`}>عرض تفاصيل الفكرة الكاملة</Link>
        </Card>
        <Card>
          <h2 className="font-bold">التقييم والتوصية</h2>
          <div className="mt-3 text-sm">متوسط التقييم: {avg.toFixed(1)} / 10 ({evaluations.length} تقييم)</div>
          <div className="mt-2">
            {recommendation ? (
              <>
                <Badge tone="beacon">{DECISION_TYPE_LABELS[recommendation.recommendationType]}</Badge>
                <p className="mt-2 text-sm">{recommendation.summary}</p>
              </>
            ) : (
              <span className="text-sm">لا توجد توصية.</span>
            )}
          </div>
        </Card>
      </div>
      {decision && (
        <Card className="mt-5">
          <h2 className="font-bold">القرار المسجل</h2>
          <div className="mt-3">
            <Badge tone={decision.decisionType === "REJECT" ? "danger" : "success"}>{DECISION_TYPE_LABELS[decision.decisionType]}</Badge>
            <p className="mt-3 text-sm">السبب: {decision.reason}</p>
            {decision.conditions && <p className="mt-2 text-sm">الشروط: {decision.conditions}</p>}
            <p className="mt-2 text-xs">اتخذ في {new Date(decision.decidedAt).toLocaleString("ar-SA")}</p>
          </div>
          {canConvert && <Button className="mt-4" onClick={openConvert}>تحويل إلى مشروع</Button>}
          {project && <Link className="mt-4 block text-[var(--color-primary)]" href={`/org/projects/${project.id}`}>عرض المشروع الناتج</Link>}
        </Card>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="اتخاذ قرار"
        footer={
          <Button onClick={handleDecide} disabled={isDeciding || !reason.trim()}>
            {isDeciding ? "جارٍ الحفظ..." : "حفظ القرار"}
          </Button>
        }
      >
        <div className="space-y-4">
          {decisionError && <p className="text-sm text-[var(--color-danger)]">{decisionError}</p>}
          <FormField label="نوع القرار">
            <Select value={type} onChange={(e) => setType(e.target.value as DecisionType)}>
              <option value="APPROVE">اعتماد</option>
              <option value="CONDITIONALLY_APPROVE">اعتماد مشروط</option>
              <option value="CONVERT_TO_PROJECT">تحويل لمشروع</option>
              <option value="DEFER">تأجيل</option>
              <option value="REJECT">رفض</option>
              <option value="REQUEST_INFORMATION">طلب معلومات إضافية</option>
            </Select>
          </FormField>
          <FormField label="السبب">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
          {type === "CONDITIONALLY_APPROVE" && (
            <FormField label="الشروط">
              <Textarea value={conditions} onChange={(e) => setConditions(e.target.value)} />
            </FormField>
          )}
        </div>
      </Modal>
      <Modal
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        title="تحويل الفكرة إلى مشروع"
        footer={
          <Button onClick={handleConvert} disabled={isConverting || !projectOwner || !projectName.trim()}>
            {isConverting ? "جارٍ الإنشاء..." : "إنشاء المشروع"}
          </Button>
        }
      >
        <div className="space-y-4">
          {convertError && <p className="text-sm text-[var(--color-danger)]">{convertError}</p>}
          <FormField label="اسم المشروع">
            <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          </FormField>
          <FormField label="مدير المشروع">
            <Select value={projectOwner} onChange={(e) => setProjectOwner(e.target.value)}>
              <option value="">اختر</option>
              {ownerCandidates.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </Select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="تاريخ البدء">
              <Input type="date" value={projectStart} onChange={(e) => setProjectStart(e.target.value)} />
            </FormField>
            <FormField label="الإنجاز المتوقع">
              <Input type="date" value={projectEnd} onChange={(e) => setProjectEnd(e.target.value)} />
            </FormField>
          </div>
        </div>
      </Modal>
    </div>
  );
}
