"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField, Input, Select, Textarea } from "@/components/ui/form";
import { IDEA_STATUS_LABELS, IDEA_STATUS_TONE, DECISION_TYPE_LABELS } from "@/lib/utils";
import type {
  Idea,
  IdeaStatus,
  IdeaStatusHistory,
  InformationRequest,
  Comment,
  EvaluatorAssignment,
  Evaluation,
  Recommendation,
  Decision,
  DecisionType,
  Project,
  InnovationChallenge,
  InnovationOpportunity,
  ImpactMeasurement,
} from "@/lib/types";
import { allowedIdeaTransitions } from "@/lib/server/workflow/idea-status";
import {
  fetchOrgIdea,
  fetchOrgCategories,
  fetchUserNames,
  fetchIdeaStatusHistory,
  fetchInformationRequests,
  fetchIdeaComments,
  transitionIdea,
  requestIdeaInformation,
  addIdeaComment,
} from "@/lib/client/org-ideas";
import {
  fetchAssignmentsForIdea,
  fetchEvaluationsForIdea,
  fetchRecommendationsForIdea,
  fetchDecisionsForIdea,
  makeDecision as makeDecisionRequest,
} from "@/lib/client/org-evaluations";
import { fetchOrgProject } from "@/lib/client/org-projects";
import { fetchOrgChallenges } from "@/lib/client/org-challenges";
import { fetchOrgOpportunities } from "@/lib/client/org-opportunities";
import { fetchOrgImpactMeasurements } from "@/lib/client/org-impact";

// Idea core (this idea, its category, submitter, status history,
// information requests, comments) is real — Phase 6, Group B. Evaluator
// assignments/evaluations/recommendations/decisions are real — Phase 6,
// Group C. The resulting project (if any) is real — Phase 6, Group D.
// Challenge/opportunity name resolution and org-wide impact measurements
// are now real too (both domains were built out in a later pass — see
// lib/client/org-challenges.ts, org-opportunities.ts, org-impact.ts).
// `idea.strategicGoalIds` is still always `[]` on a real idea — no real
// idea<->strategic-goal join table is populated anywhere yet — so the
// "الأهداف" field below stays empty for a real idea; that remains correct,
// not a bug to work around.
export default function IdeaDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const [idea, setIdea] = useState<Idea | null>(null);
  const [categoryName, setCategoryName] = useState<string>();
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
  const [history, setHistory] = useState<IdeaStatusHistory[]>([]);
  const [requests, setRequests] = useState<InformationRequest[]>([]);
  const [ideaComments, setIdeaComments] = useState<Comment[]>([]);
  const [assignments, setAssignments] = useState<EvaluatorAssignment[]>([]);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [challenges, setChallenges] = useState<InnovationChallenge[]>([]);
  const [opportunities, setOpportunities] = useState<InnovationOpportunity[]>([]);
  const [impactMeasurements, setImpactMeasurements] = useState<ImpactMeasurement[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  // Pure fetch — does not touch component state itself, so it's safe to
  // call both from the mount/retry effect below and from mutation handlers
  // (which set state directly, not from inside an effect).
  const loadIdeaData = useCallback(async (ideaId: string) => {
    const fetchedIdea = await fetchOrgIdea(ideaId);
    const [
      categories,
      fetchedHistory,
      fetchedRequests,
      fetchedComments,
      fetchedAssignments,
      fetchedEvals,
      fetchedRecs,
      fetchedDecisions,
      fetchedChallenges,
      fetchedOpportunities,
      fetchedImpact,
    ] = await Promise.all([
      fetchOrgCategories(fetchedIdea.organizationId),
      fetchIdeaStatusHistory(ideaId),
      fetchInformationRequests(ideaId),
      fetchIdeaComments(ideaId),
      fetchAssignmentsForIdea(ideaId),
      fetchEvaluationsForIdea(ideaId),
      fetchRecommendationsForIdea(ideaId),
      fetchDecisionsForIdea(ideaId),
      fetchOrgChallenges(fetchedIdea.organizationId),
      fetchOrgOpportunities(fetchedIdea.organizationId),
      fetchOrgImpactMeasurements(fetchedIdea.organizationId),
    ]);
    const names = await fetchUserNames([
      fetchedIdea.submitterId,
      ...fetchedComments.map((c) => c.authorId),
      ...fetchedAssignments.map((a) => a.evaluatorId),
    ]);
    const fetchedProject = fetchedIdea.projectId ? await fetchOrgProject(fetchedIdea.projectId).catch(() => null) : null;
    return {
      idea: fetchedIdea,
      categoryName: categories.find((c) => c.id === fetchedIdea.categoryId)?.name,
      userNames: names,
      history: fetchedHistory,
      requests: fetchedRequests,
      comments: fetchedComments,
      assignments: fetchedAssignments,
      evals: fetchedEvals,
      recs: fetchedRecs,
      decisions: fetchedDecisions,
      project: fetchedProject,
      challenges: fetchedChallenges,
      opportunities: fetchedOpportunities,
      impactMeasurements: fetchedImpact,
    };
  }, []);

  const applyLoadedData = useCallback((data: Awaited<ReturnType<typeof loadIdeaData>>) => {
    setIdea(data.idea);
    setCategoryName(data.categoryName);
    setUserNames(data.userNames);
    setHistory(data.history);
    setRequests(data.requests);
    setIdeaComments(data.comments);
    setAssignments(data.assignments);
    setEvals(data.evals);
    setRecs(data.recs);
    setDecisions(data.decisions);
    setProject(data.project);
    setChallenges(data.challenges);
    setOpportunities(data.opportunities);
    setImpactMeasurements(data.impactMeasurements);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadIdeaData(id)
      .then((data) => {
        if (cancelled) return;
        applyLoadedData(data);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey, loadIdeaData, applyLoadedData]);

  const retry = () => {
    setLoadState("loading");
    setReloadKey((k) => k + 1);
  };

  /** Re-fetches after a mutation succeeds — called from event handlers, never from an effect. */
  const reloadAfterMutation = async () => {
    try {
      applyLoadedData(await loadIdeaData(id));
    } catch {
      setLoadState("error");
    }
  };

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoText, setInfoText] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [transitioningTo, setTransitioningTo] = useState<IdeaStatus | null>(null);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<DecisionType>("APPROVE");
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionConditions, setDecisionConditions] = useState("");
  const [isDeciding, setIsDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState("");

  // CONVERTED_TO_PROJECT is graph-legal from APPROVED/IDEA_DEVELOPMENT but is
  // deliberately excluded from this generic "any legal next status" button
  // row: unlike every other transition, it has a required side effect (a
  // real row in `projects`, owner + dates collected from the user) that
  // transitionIdeaStatusAction does not perform — it only flips the status
  // column. Reaching this status here would leave the idea marked converted
  // with no actual project behind it. The real conversion flow (project
  // name/owner/dates form -> createProjectFromIdeaAction, which creates the
  // project AND performs this exact transition atomically) lives on
  // app/org/decisions/[id]/page.tsx.
  const allowed = useMemo(
    () => (idea ? allowedIdeaTransitions(idea.status).filter((s) => s !== "CONVERTED_TO_PROJECT") : []),
    [idea]
  );

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل الفكرة..." />;
  if (loadState === "error" || !idea) {
    return (
      <EmptyState
        title="تعذر تحميل الفكرة"
        description="حدث خطأ أثناء الاتصال بالخادم، أو أن الفكرة غير موجودة."
        action={<Button variant="outline" onClick={retry}>إعادة المحاولة</Button>}
      />
    );
  }

  const challenge = challenges.find((c) => c.id === idea.challengeId);
  const opportunity = opportunities.find((o) => o.id === idea.opportunityId);
  const impacts = impactMeasurements.filter((m) => m.ideaId === id || m.projectId === idea.projectId);

  const handleTransition = async (status: IdeaStatus) => {
    setTransitioningTo(status);
    try {
      await transitionIdea(idea.id, status, `انتقال حسب Workflow إلى ${IDEA_STATUS_LABELS[status]}`);
    } finally {
      await reloadAfterMutation();
      setTransitioningTo(null);
    }
  };

  const handleRequestInfo = async () => {
    if (!infoText.trim()) return;
    setIsSubmittingInfo(true);
    try {
      await requestIdeaInformation(idea.id, infoText);
      setInfoOpen(false);
      setInfoText("");
    } finally {
      await reloadAfterMutation();
      setIsSubmittingInfo(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setIsSubmittingComment(true);
    try {
      await addIdeaComment(idea.id, comment);
      setComment("");
    } finally {
      await reloadAfterMutation();
      setIsSubmittingComment(false);
    }
  };

  const handleDecide = async () => {
    if (!decisionReason.trim()) return;
    setIsDeciding(true);
    setDecisionError("");
    try {
      await makeDecisionRequest({
        ideaId: idea.id,
        decisionType,
        reason: decisionReason,
        conditions: decisionType === "CONDITIONALLY_APPROVE" ? decisionConditions || undefined : undefined,
      });
      setDecisionOpen(false);
      setDecisionReason("");
      setDecisionConditions("");
      await reloadAfterMutation();
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : "تعذر حفظ القرار.");
    } finally {
      setIsDeciding(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={idea.title}
        description="تفاصيل الفكرة الكاملة: Timeline، التقييمات، القرار، المشروع، التعليقات والأثر."
        breadcrumbs={[{ label: "محفظة الأفكار", href: "/org/ideas" }, { label: idea.title }]}
        actions={
          <>
            <Button variant="outline" onClick={() => setInfoOpen(true)}>طلب معلومات</Button>
            {decisions.length === 0 ? (
              <Button onClick={() => setDecisionOpen(true)}>اتخاذ قرار</Button>
            ) : (
              <Button disabled title="تم اتخاذ القرار على هذه الفكرة مسبقًا.">اتخاذ قرار</Button>
            )}
          </>
        }
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
                {transitioningTo === st ? "جارٍ التنفيذ..." : IDEA_STATUS_LABELS[st]}
              </Button>
            ))}
          </div>
        </Card>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-bold">نظرة عامة</h2>
              <Badge tone={IDEA_STATUS_TONE[idea.status]}>{IDEA_STATUS_LABELS[idea.status]}</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
              <Info l="مقدم الفكرة" v={userNames.get(idea.submitterId)} />
              <Info l="التصنيف" v={categoryName} />
              <Info l="التحدي" v={challenge?.title} />
              <Info l="الفرصة" v={opportunity?.title} />
              <Info l="الأهداف" v={idea.strategicGoalIds.length ? idea.strategicGoalIds.join("، ") : undefined} />
              <Info l="تاريخ التقديم" v={new Date(idea.submittedAt).toLocaleDateString("ar-SA")} />
            </div>
            <p className="mt-4 text-sm">{idea.description}</p>
          </Card>
          <Card>
            <h2 className="font-bold">المشكلة والحل والأثر المتوقع</h2>
            <div className="mt-3 space-y-3 text-sm">
              <Info l="المشكلة" v={idea.problemStatement} />
              <Info l="الحل المقترح" v={idea.proposedSolution} />
              <Info l="الأثر المتوقع" v={idea.expectedImpact} />
            </div>
          </Card>
          <Card>
            <h2 className="font-bold">التقييم والمقيمون</h2>
            <div className="mt-3 space-y-3">
              {assignments.map((a) => (
                <div key={a.id} className="rounded-xl border p-3 text-sm">
                  <b>{userNames.get(a.evaluatorId) ?? "—"}</b> · {a.status} · الاستحقاق {a.dueAt ? new Date(a.dueAt).toLocaleDateString("ar-SA") : "—"}
                </div>
              ))}
              {evals.map((e) => (
                <div key={e.id} className="rounded-xl bg-[var(--color-surface-sunken)] p-3 text-sm">
                  نتيجة {userNames.get(e.evaluatorId) ?? "—"}: {((e.strategicAlignmentScore + e.feasibilityScore + e.resourceReadinessScore) / 3).toFixed(1)} / 10<br />{e.notes}
                </div>
              ))}
              {assignments.length === 0 && evals.length === 0 && (
                <p className="text-sm text-[var(--color-ink-soft)]">لا توجد بيانات تقييم بعد.</p>
              )}
            </div>
          </Card>
          <Card>
            <h2 className="font-bold">طلبات المعلومات</h2>
            <div className="mt-3 space-y-3">
              {requests.length ? requests.map((r) => (
                <div key={r.id} className="rounded-xl border p-3 text-sm">
                  <b>{r.requestText}</b>
                  <div className="mt-1 text-xs">الحالة: {r.status}</div>
                  {r.responseText && <p className="mt-2">الرد: {r.responseText}</p>}
                </div>
              )) : <p className="text-sm text-[var(--color-ink-soft)]">لا توجد طلبات.</p>}
            </div>
          </Card>
          <Card>
            <h2 className="font-bold">التوصيات والقرارات</h2>
            <div className="mt-3 space-y-3">
              {recs.map((r) => (
                <div key={r.id} className="rounded-xl border p-3 text-sm">
                  <b>{DECISION_TYPE_LABELS[r.recommendationType]}</b>
                  <p>{r.summary}</p>
                </div>
              ))}
              {decisions.map((x) => (
                <div key={x.id} className="rounded-xl bg-[var(--color-surface-sunken)] p-3 text-sm">
                  <b>{DECISION_TYPE_LABELS[x.decisionType]}</b>
                  <p>{x.reason}</p>
                  {x.conditions && <p>الشروط: {x.conditions}</p>}
                </div>
              ))}
              {recs.length === 0 && decisions.length === 0 && (
                <p className="text-sm text-[var(--color-ink-soft)]">لا توجد توصيات أو قرارات بعد.</p>
              )}
            </div>
          </Card>
          <Card>
            <h2 className="font-bold">المشروع والأثر</h2>
            {project ? (
              <div className="mt-3">
                <Link className="font-medium text-[var(--color-primary)] hover:underline" href={`/org/projects/${project.id}`}>{project.name}</Link>
                <div className="mt-2 text-sm">التقدم {project.progress}% · الميزانية {project.budget ?? 0} · التكلفة الفعلية {project.actualCost ?? 0}</div>
              </div>
            ) : <p className="mt-2 text-sm text-[var(--color-ink-soft)]">لم يتم إنشاء مشروع بعد.</p>}
            <div className="mt-3 space-y-2">
              {impacts.map((m) => (
                <div key={m.id} className="text-sm">{m.description}: {m.actualValue ?? "—"} {m.unit}</div>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="font-bold">التعليقات والمناقشات</h2>
            <div className="mt-3 space-y-2">
              {ideaComments.map((c) => (
                <div key={c.id} className="rounded-xl border p-3 text-sm">{userNames.get(c.authorId) ?? "—"}: {c.content}</div>
              ))}
              {ideaComments.length === 0 && <p className="text-sm text-[var(--color-ink-soft)]">لا توجد تعليقات بعد.</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="اكتب تعليقًا" disabled={isSubmittingComment} />
              <Button onClick={handleAddComment} disabled={isSubmittingComment || !comment.trim()}>إضافة</Button>
            </div>
          </Card>
        </div>
        <Card>
          <h2 className="font-bold">Timeline</h2>
          <div className="mt-4 space-y-4">
            {history.map((h, i) => (
              <div key={h.id} className="relative pr-5 text-sm before:absolute before:right-0 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-[var(--color-primary)]">
                <b>{IDEA_STATUS_LABELS[h.toStatus]}</b>
                <div className="text-xs text-[var(--color-ink-soft)]">{new Date(h.changedAt).toLocaleString("ar-SA")}</div>
                {h.note && <p className="mt-1 text-xs">{h.note}</p>}
                {i < history.length - 1 && <span className="absolute right-[3px] top-4 h-10 w-px bg-[var(--color-border)]" />}
              </div>
            ))}
            {history.length === 0 && <p className="text-sm text-[var(--color-ink-soft)]">لا يوجد سجل حالة بعد.</p>}
          </div>
        </Card>
      </div>
      <Modal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title="طلب معلومات إضافية"
        footer={
          <>
            <Button variant="outline" onClick={() => setInfoOpen(false)} disabled={isSubmittingInfo}>إلغاء</Button>
            <Button onClick={handleRequestInfo} disabled={isSubmittingInfo || !infoText.trim()}>
              {isSubmittingInfo ? "جارٍ الإرسال..." : "إرسال"}
            </Button>
          </>
        }
      >
        <FormField label="المعلومات المطلوبة">
          <Textarea value={infoText} onChange={(e) => setInfoText(e.target.value)} />
        </FormField>
      </Modal>
      <Modal
        open={decisionOpen}
        onClose={() => setDecisionOpen(false)}
        title="اتخاذ قرار"
        footer={
          <Button onClick={handleDecide} disabled={isDeciding || !decisionReason.trim()}>
            {isDeciding ? "جارٍ الحفظ..." : "حفظ القرار"}
          </Button>
        }
      >
        <div className="space-y-4">
          {decisionError && <p className="text-sm text-[var(--color-danger)]">{decisionError}</p>}
          <FormField label="نوع القرار">
            <Select value={decisionType} onChange={(e) => setDecisionType(e.target.value as DecisionType)}>
              <option value="APPROVE">اعتماد</option>
              <option value="CONDITIONALLY_APPROVE">اعتماد مشروط</option>
              <option value="CONVERT_TO_PROJECT">تحويل لمشروع</option>
              <option value="DEFER">تأجيل</option>
              <option value="REJECT">رفض</option>
              <option value="REQUEST_INFORMATION">طلب معلومات إضافية</option>
            </Select>
          </FormField>
          <FormField label="السبب">
            <Textarea value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} />
          </FormField>
          {decisionType === "CONDITIONALLY_APPROVE" && (
            <FormField label="الشروط">
              <Textarea value={decisionConditions} onChange={(e) => setDecisionConditions(e.target.value)} />
            </FormField>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Info({ l, v }: { l: string; v?: string }) {
  return (
    <div>
      <span className="text-xs text-[var(--color-ink-soft)]">{l}</span>
      <div className="font-medium">{v || "—"}</div>
    </div>
  );
}
