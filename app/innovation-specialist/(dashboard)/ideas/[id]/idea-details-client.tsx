"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Info, Plus, Send, UserRound } from "lucide-react";
import { Button, Card, EmptyState, FormField, Modal, StatusBadge, Tabs } from "@/components/innovation-specialist";
import { IDEA_STATUS_LABELS, IDEA_STATUS_TONE, SUBMITTER_TYPE_LABELS, formatDate, formatDateTime } from "@/lib/utils";
import type { Idea, IdeaStatus, IdeaStatusHistory, InformationRequest, EvaluatorAssignment, Evaluation } from "@/lib/types";
import { allowedIdeaTransitions, canTransitionIdea } from "@/lib/server/workflow/idea-status";
import {
  fetchSpecialistIdea,
  fetchSpecialistCategories,
  fetchUserNames,
  fetchIdeaStatusHistory,
  fetchInformationRequests,
  transitionIdea,
  requestIdeaInformation,
  getCurrentSpecialistSession,
} from "@/lib/client/specialist-ideas";
import {
  fetchAssignmentsForIdea,
  fetchEvaluationsForIdea,
  submitMyEvaluation,
} from "@/lib/client/specialist-evaluations";

/**
 * Phase 6, Group B + Group C. Overview/status/actions/communication
 * (information requests) are wired to the real backend (Group B).
 * Evaluation is real as of Group C: a specialist assigned as evaluator for
 * this idea (idea_evaluator_assignments) can submit a real, once-only
 * evaluation (evaluations table) via EVALUATION:EVALUATE.
 *
 * Recommendation stays local-only scratch UI — NOT a Group C oversight: the
 * real seeded RBAC catalog (db/migrations/0010_rbac_seed.sql) grants
 * INNOVATION_SPECIALIST no GOVERNANCE:* permission at all, so recommendation
 * submission and decision-making are only possible for ORG_ADMIN under the
 * current, unmodified permission catalog. Per the user's explicit Group C
 * decision, this tab is kept exactly as non-functional scratch UI rather
 * than granting a new permission — see the Group C report.
 */

const tabs = ["نظرة عامة", "التقييم", "التواصل والاستكمال", "التوصية"];
const inputClass = "min-h-11 w-full rounded-lg border border-ispec-border bg-ispec-surface px-3 text-sm text-ispec-ink disabled:bg-ispec-surface-sunken disabled:text-ispec-ink-soft";
const textareaClass = `${inputClass} min-h-28 py-3 leading-6`;

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return <div><p className="text-xs font-semibold text-ispec-ink-soft">{label}</p><div className="mt-2 text-sm leading-7 text-ispec-ink">{children}</div></div>;
}
function SectionTitle({ title, description }: { title: string; description?: string }) {
  return <div className="mb-5"><h2 className="text-lg font-bold text-ispec-ink">{title}</h2>{description && <p className="mt-1 text-sm text-ispec-ink-soft">{description}</p>}</div>;
}

const tabByQuery: Record<string, string> = { overview: "نظرة عامة", evaluation: "التقييم", communication: "التواصل والاستكمال", recommendation: "التوصية" };
const requestStatusLabel: Record<InformationRequest["status"], string> = { OPEN: "بانتظار الرد", RESPONDED: "تم الرد", CLOSED: "مغلق" };
const requestStatusTone: Record<InformationRequest["status"], "warning" | "success" | "neutral"> = { OPEN: "warning", RESPONDED: "success", CLOSED: "neutral" };

type LoadedData = {
  idea: Idea;
  categoryName: string;
  submitterName: string;
  history: IdeaStatusHistory[];
  requests: InformationRequest[];
  myUserId: string;
  assignments: EvaluatorAssignment[];
  evaluations: Evaluation[];
  userNames: Map<string, string>;
};

export function IdeaDetailsClient({ id, initialTab = "overview" }: { id: string; initialTab?: string }) {
  const [activeTab, setActiveTab] = useState(tabByQuery[initialTab] ?? tabs[0]);

  const [idea, setIdea] = useState<Idea | null>(null);
  const [categoryName, setCategoryName] = useState<string>();
  const [submitterName, setSubmitterName] = useState<string>();
  const [history, setHistory] = useState<IdeaStatusHistory[]>([]);
  const [requests, setRequests] = useState<InformationRequest[]>([]);
  const [myUserId, setMyUserId] = useState<string>("");
  const [assignments, setAssignments] = useState<EvaluatorAssignment[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  // Pure fetch — does not touch component state itself, so it's safe to
  // call both from the mount/retry effect below and from mutation handlers
  // (which set state directly, not from inside an effect). Mirrors the
  // exact pattern already established in app/org/ideas/[id]/page.tsx.
  const loadIdeaData = useCallback(async (ideaId: string): Promise<LoadedData> => {
    const [fetchedIdea, session] = await Promise.all([
      fetchSpecialistIdea(ideaId),
      getCurrentSpecialistSession(),
    ]);
    const [categories, fetchedHistory, fetchedRequests, fetchedAssignments, fetchedEvaluations] = await Promise.all([
      fetchSpecialistCategories(fetchedIdea.organizationId),
      fetchIdeaStatusHistory(ideaId),
      fetchInformationRequests(ideaId),
      fetchAssignmentsForIdea(ideaId),
      fetchEvaluationsForIdea(ideaId),
    ]);
    const names = await fetchUserNames([fetchedIdea.submitterId, ...fetchedAssignments.map((a) => a.evaluatorId)]);
    return {
      idea: fetchedIdea,
      categoryName: categories.find((c) => c.id === fetchedIdea.categoryId)?.name ?? "—",
      submitterName: names.get(fetchedIdea.submitterId) ?? "—",
      history: fetchedHistory,
      requests: fetchedRequests,
      myUserId: session.userId,
      assignments: fetchedAssignments,
      evaluations: fetchedEvaluations,
      userNames: names,
    };
  }, []);

  const applyLoadedData = useCallback((data: LoadedData) => {
    setIdea(data.idea);
    setCategoryName(data.categoryName);
    setSubmitterName(data.submitterName);
    setHistory(data.history);
    setRequests(data.requests);
    setMyUserId(data.myUserId);
    setAssignments(data.assignments);
    setEvaluations(data.evaluations);
    setUserNames(data.userNames);
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

  const [success, setSuccess] = useState("");
  const showSuccess = (message: string) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 3500);
  };

  const [requestModal, setRequestModal] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [transitioningTo, setTransitioningTo] = useState<IdeaStatus | null>(null);

  // Evaluation tab — real as of Group C. Exactly the three criteria the
  // real `evaluations` table has a column for (strategic_alignment_score /
  // feasibility_score / resource_readiness_score, each 0-10 per
  // submitEvaluationSchema) — the mock's fourth "وضوح الفكرة" criterion had
  // no backend field and is dropped rather than fabricated, per the
  // approved Group C decision. Per-criterion comment boxes are similarly
  // dropped: the real schema has a single `notes` field, not one per
  // criterion.
  const evaluationCriteria = [
    { key: "strategicAlignmentScore" as const, label: "المواءمة مع الأهداف الاستراتيجية", helper: "مدى ارتباط الفكرة بأهداف الجهة وأولوياتها." },
    { key: "feasibilityScore" as const, label: "قابلية التطبيق", helper: "إمكانية تنفيذ الفكرة ضمن البيئة التنظيمية الحالية." },
    { key: "resourceReadinessScore" as const, label: "ملاءمة الموارد والإمكانات الحالية", helper: "توفر الموارد والتقنيات والخبرات المطلوبة." },
  ];
  const [evalScores, setEvalScores] = useState({ strategicAlignmentScore: 5, feasibilityScore: 5, resourceReadinessScore: 5 });
  const [evalNotes, setEvalNotes] = useState("");
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);
  const [evaluationError, setEvaluationError] = useState("");

  const myAssignment = useMemo(() => assignments.find((a) => a.evaluatorId === myUserId), [assignments, myUserId]);
  const myEvaluation = useMemo(() => evaluations.find((e) => e.evaluatorId === myUserId), [evaluations, myUserId]);
  const evaluationAverage = useMemo(
    () => (evaluations.length ? (evaluations.reduce((sum, e) => sum + (e.strategicAlignmentScore + e.feasibilityScore + e.resourceReadinessScore) / 3, 0) / evaluations.length).toFixed(1) : "—"),
    [evaluations]
  );

  const handleSubmitEvaluation = async () => {
    if (!idea) return;
    setIsSubmittingEvaluation(true);
    setEvaluationError("");
    try {
      await submitMyEvaluation({ ideaId: idea.id, notes: evalNotes.trim() || "لا توجد ملاحظات إضافية.", ...evalScores });
      showSuccess("تم تقديم التقييم بنجاح.");
      await reloadAfterMutation();
    } catch (err) {
      setEvaluationError(err instanceof Error ? err.message : "تعذر تقديم التقييم.");
    } finally {
      setIsSubmittingEvaluation(false);
    }
  };

  // Recommendation tab: local scratch UI only — recommendation/decision
  // authority belongs to ORG_ADMIN under the real, unmodified RBAC catalog
  // (see the header note above). Kept exactly as non-functional scratch UI
  // per the approved Group C decision.
  const [recommendation, setRecommendation] = useState({
    strengths: "ارتباط مباشر بالأهداف الاستراتيجية، وأثر تشغيلي قابل للقياس.",
    challenges: "تكامل بيانات العدادات وتفاوت جاهزية أنظمة المباني.",
    risks: "جودة البيانات ومقاومة التغيير في الممارسات التشغيلية.",
    decision: "تحتاج تطوير قبل الاعتماد",
    justification: "يوصى باستكمال خطة التجربة ومؤشرات القياس وخطة تكامل البيانات قبل الرفع للاعتماد.",
  });
  const [recommendationSubmitted, setRecommendationSubmitted] = useState(false);

  if (loadState === "loading") {
    return (
      <div className="mx-auto max-w-[1500px]">
        <div className="mt-6 flex min-h-72 items-center justify-center rounded-xl border border-dashed border-ispec-border bg-ispec-surface text-sm text-ispec-ink-soft">جارٍ تحميل الفكرة...</div>
      </div>
    );
  }
  if (loadState === "error" || !idea) {
    return (
      <div className="mx-auto max-w-[1500px]">
        <EmptyState
          title="تعذر تحميل الفكرة"
          description="حدث خطأ أثناء الاتصال بالخادم، أو أن الفكرة غير موجودة."
          actions={<Button onClick={retry}>إعادة المحاولة</Button>}
        />
      </div>
    );
  }

  // CONVERTED_TO_PROJECT is excluded here for the same reason as the Org
  // Admin idea detail page (app/org/ideas/[id]/page.tsx): it requires a real
  // `projects` row (owner/dates), which only createProjectFromIdeaAction
  // creates — a bare transitionIdeaStatusAction call here would mark the
  // idea converted with no project behind it. That real flow lives on the
  // Org Admin's decisions page, not this interface.
  const allowed = allowedIdeaTransitions(idea.status).filter((s) => s !== "CONVERTED_TO_PROJECT");
  const canRequestInfo = canTransitionIdea(idea.status, "NEEDS_INFORMATION");

  const handleTransition = async (status: IdeaStatus) => {
    setTransitioningTo(status);
    try {
      await transitionIdea(idea.id, status, `انتقال حسب Workflow إلى ${IDEA_STATUS_LABELS[status]}`);
      showSuccess(`تم نقل الفكرة إلى ${IDEA_STATUS_LABELS[status]}.`);
    } finally {
      await reloadAfterMutation();
      setTransitioningTo(null);
    }
  };

  const sendRequest = async () => {
    if (!requestText.trim()) return;
    setIsSubmittingRequest(true);
    try {
      await requestIdeaInformation(idea.id, requestText);
      setRequestModal(false);
      setRequestText("");
      showSuccess("تم إرسال طلب استكمال المعلومات بنجاح.");
    } finally {
      await reloadAfterMutation();
      setIsSubmittingRequest(false);
    }
  };

  const submitRecommendation = () => {
    setRecommendationSubmitted(true);
    showSuccess("تم حفظ التوصية محليًا فقط — تقديم التوصية الفعلي يقع ضمن صلاحيات مسؤول الجهة.");
  };

  return <div className="mx-auto max-w-[1500px]">
    {success && <div role="status" className="fixed left-5 top-20 z-50 flex items-center gap-2 rounded-lg border border-ispec-success-soft bg-ispec-success-soft px-4 py-3 text-sm font-semibold text-ispec-success shadow-ispec-card"><Check className="h-4 w-4"/>{success}</div>}

    <Link href="/innovation-specialist/ideas" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-ispec-ink-soft hover:text-ispec-brand-700"><ArrowRight className="h-4 w-4"/>العودة إلى الأفكار</Link>
    <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ispec-brand-700">{idea.id}</span>
          <StatusBadge tone={IDEA_STATUS_TONE[idea.status]}>{IDEA_STATUS_LABELS[idea.status]}</StatusBadge>
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-9 text-ispec-ink">{idea.title}</h1>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ispec-ink-soft">
          <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4"/>تاريخ التقديم: {formatDate(idea.submittedAt)}</span>
          <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4"/>آخر تحديث: {formatDate(idea.updatedAt)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={!canRequestInfo}
          title={canRequestInfo ? undefined : "لا يمكن طلب استكمال معلومات من الحالة الحالية للفكرة."}
          onClick={() => setRequestModal(true)}
        >
          طلب استكمال معلومات
        </Button>
      </div>
    </div>

    {allowed.length > 0 && (
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <b className="ml-2 text-sm text-ispec-ink-soft">الإجراءات المتاحة حسب Workflow:</b>
          {allowed.map((status) => (
            <Button key={status} variant="secondary" className="min-h-9 px-3 text-xs" disabled={transitioningTo !== null} onClick={() => handleTransition(status)}>
              {transitioningTo === status ? "جارٍ التنفيذ..." : IDEA_STATUS_LABELS[status]}
            </Button>
          ))}
        </div>
      </Card>
    )}

    <Card className="p-0"><Tabs tabs={tabs} active={activeTab} onChange={setActiveTab}/></Card>

    {activeTab === "نظرة عامة" && <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <Card>
          <SectionTitle title="معلومات الفكرة"/>
          <div className="grid gap-6 md:grid-cols-2">
            <FieldBlock label="عنوان الفكرة"><strong>{idea.title}</strong></FieldBlock>
            <FieldBlock label="التصنيف">{categoryName}</FieldBlock>
            <div className="md:col-span-2"><FieldBlock label="وصف الفكرة">{idea.description}</FieldBlock></div>
            <FieldBlock label="المشكلة أو التحدي">{idea.problemStatement}</FieldBlock>
            <FieldBlock label="الحل المقترح">{idea.proposedSolution}</FieldBlock>
            <div className="md:col-span-2"><FieldBlock label="الأثر المتوقع">{idea.expectedImpact}</FieldBlock></div>
          </div>
        </Card>
        <Card>
          <SectionTitle title="المرفقات"/>
          {idea.attachments.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">{idea.attachments.map((file) => <span key={file.id} className="text-sm text-ispec-ink-soft">{file.fileName}</span>)}</div>
          ) : (
            <p className="text-sm text-ispec-ink-soft">لا توجد مرفقات على هذه الفكرة.</p>
          )}
        </Card>
        <Card>
          <SectionTitle title="سجل الحالة"/>
          <div className="space-y-0">
            {history.map((item, index) => (
              <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                <span className="relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full bg-ispec-brand-700 ring-4 ring-ispec-brand-50"/>
                {index < history.length - 1 && <span className="absolute right-[5px] top-4 h-full w-px bg-ispec-border-soft"/>}
                <div>
                  <p className="text-sm font-semibold">{IDEA_STATUS_LABELS[item.toStatus]}</p>
                  <p className="mt-1 text-xs text-ispec-ink-soft">{formatDateTime(item.changedAt)}</p>
                  {item.note && <p className="mt-1 text-xs text-ispec-ink-soft">{item.note}</p>}
                </div>
              </div>
            ))}
            {history.length === 0 && <p className="text-sm text-ispec-ink-soft">لا يوجد سجل حالة بعد.</p>}
          </div>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ispec-brand-50 text-ispec-brand-700"><UserRound/></span>
            <div><h2 className="font-bold">بيانات المبتكر</h2><p className="text-xs text-ispec-ink-soft">صاحب الفكرة</p></div>
          </div>
          <div className="space-y-4">
            <FieldBlock label="اسم المبتكر">{submitterName}</FieldBlock>
            <FieldBlock label="نوع المبتكر">{SUBMITTER_TYPE_LABELS[idea.submitterType]}</FieldBlock>
          </div>
        </Card>
        <Card>
          <SectionTitle title="بيانات الفكرة"/>
          <div className="space-y-4">
            <FieldBlock label="الرقم المرجعي">{idea.id}</FieldBlock>
            <FieldBlock label="تاريخ التقديم">{formatDate(idea.submittedAt)}</FieldBlock>
            <FieldBlock label="آخر تحديث">{formatDate(idea.updatedAt)}</FieldBlock>
          </div>
        </Card>
      </div>
    </div>}

    {activeTab === "التقييم" && <div className="mt-6 space-y-6">
      {!myAssignment && (
        <EmptyState
          title="لم يتم تعيينك كمقيّم لهذه الفكرة"
          description="لا يمكن تقديم تقييم إلا لمن تم تعيينه كمقيّم على هذه الفكرة تحديدًا."
        />
      )}
      {myAssignment && myEvaluation && (
        <Card>
          <SectionTitle title="تقييمك المُقدَّم" description={`تم التقديم في ${formatDateTime(myEvaluation.submittedAt)} — لا يمكن تعديل تقييم بعد تقديمه.`}/>
          <div className="grid gap-4 sm:grid-cols-3">
            <FieldBlock label="المواءمة مع الأهداف الاستراتيجية">{myEvaluation.strategicAlignmentScore} / 10</FieldBlock>
            <FieldBlock label="قابلية التطبيق">{myEvaluation.feasibilityScore} / 10</FieldBlock>
            <FieldBlock label="ملاءمة الموارد والإمكانات الحالية">{myEvaluation.resourceReadinessScore} / 10</FieldBlock>
          </div>
          <div className="mt-4"><FieldBlock label="الملاحظات">{myEvaluation.notes}</FieldBlock></div>
        </Card>
      )}
      {myAssignment && !myEvaluation && (
        <Card>
          <SectionTitle title="تقديم التقييم" description="مرتبط بتعيينك كمقيّم لهذه الفكرة، ويُحفظ مباشرة على النظام الفعلي — لا يمكن التعديل بعد التقديم."/>
          {evaluationError && <p className="mb-4 text-sm text-ispec-danger">{evaluationError}</p>}
          <div className="grid gap-5 lg:grid-cols-3">
            {evaluationCriteria.map((criterion) => (
              <div key={criterion.key}>
                <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-ispec-ink">{criterion.label}</h3><span className="text-sm font-bold text-ispec-brand-700">{evalScores[criterion.key]} / 10</span></div>
                <p className="mt-1 text-xs text-ispec-ink-soft">{criterion.helper}</p>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  aria-label={`درجة ${criterion.label}`}
                  value={evalScores[criterion.key]}
                  onChange={(event) => setEvalScores((current) => ({ ...current, [criterion.key]: Number(event.target.value) }))}
                  className="mt-4 w-full"
                />
              </div>
            ))}
          </div>
          <div className="mt-5"><FormField label="ملاحظات عامة"><textarea value={evalNotes} onChange={(event) => setEvalNotes(event.target.value)} className={textareaClass} placeholder="اكتب ملاحظاتك على التقييم"/></FormField></div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button onClick={handleSubmitEvaluation} disabled={isSubmittingEvaluation}>{isSubmittingEvaluation ? "جارٍ الإرسال..." : "تقديم التقييم"}</Button>
          </div>
        </Card>
      )}
      {(assignments.length > 0 || evaluations.length > 0) && (
        <Card>
          <SectionTitle title="التقييمات في هذه الفكرة"/>
          <div className="space-y-3">
            {assignments.map((a) => {
              const ev = evaluations.find((e) => e.evaluatorId === a.evaluatorId);
              return (
                <div key={a.id} className="rounded-lg border border-ispec-border-soft p-3 text-sm">
                  <b>{userNames.get(a.evaluatorId) ?? "—"}</b> · {a.status}
                  {ev && <span> · متوسط {((ev.strategicAlignmentScore + ev.feasibilityScore + ev.resourceReadinessScore) / 3).toFixed(1)} / 10</span>}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>}

    {activeTab === "التواصل والاستكمال" && <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <SectionTitle title="طلبات استكمال المعلومات" description="متابعة الطلبات والردود الواردة من المبتكر."/>
        <Button disabled={!canRequestInfo} title={canRequestInfo ? undefined : "لا يمكن طلب استكمال معلومات من الحالة الحالية للفكرة."} onClick={() => setRequestModal(true)}><Plus className="h-4 w-4"/>طلب استكمال معلومات</Button>
      </div>
      <div className="space-y-4">
        {requests.length > 0 ? requests.map((request) => (
          <Card key={request.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-xs text-ispec-ink-soft">أُرسل في {formatDate(request.requestedAt)}</p>
              <StatusBadge tone={requestStatusTone[request.status]}>{requestStatusLabel[request.status]}</StatusBadge>
            </div>
            <p className="mt-4 text-sm leading-6 text-ispec-ink-soft">{request.requestText}</p>
            {request.responseText && (
              <div className="mt-5 rounded-lg border border-ispec-border-soft bg-ispec-surface-sunken p-4">
                <p className="text-xs font-bold text-ispec-ink-soft">رد المبتكر</p>
                <p className="mt-2 text-sm leading-6">{request.responseText}</p>
                {request.respondedAt && <p className="mt-2 text-xs text-ispec-ink-soft">{formatDate(request.respondedAt)}</p>}
              </div>
            )}
          </Card>
        )) : <EmptyState title="لا توجد طلبات استكمال معلومات" description="لم يتم إرسال أي طلب استكمال معلومات لهذه الفكرة بعد."/>}
      </div>
    </div>}

    {activeTab === "التوصية" && <div className="mt-6 grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card>
        <SectionTitle title="ملخص التقييم"/>
        <div className="rounded-xl bg-ispec-brand-50 p-5 text-center"><p className="text-sm text-ispec-brand-800">متوسط التقييم ({evaluations.length} تقييم)</p><p className="mt-2 text-4xl font-black text-ispec-brand-800">{evaluationAverage}<span className="text-lg"> / 10</span></p></div>
        <div className="mt-5 rounded-lg border border-ispec-warning-soft bg-ispec-warning-soft p-3 text-xs leading-5 text-ispec-warning"><Info className="mb-2 h-4 w-4"/>بحسب الصلاحيات المعتمدة حاليًا، تقديم التوصية واتخاذ القرار على الأفكار يقعان ضمن صلاحيات مسؤول الجهة فقط. النموذج المقابل أداة تحضير محلية ولا يُرفع إلى النظام الفعلي.</div>
      </Card>
      <Card>
        <SectionTitle title="إعداد التوصية" description="لخص نتائج المراجعة — يُحفظ محليًا فقط، لتحضير المدخلات لمسؤول الجهة."/>
        {recommendationSubmitted && <div className="mb-5 rounded-lg border border-ispec-success-soft bg-ispec-success-soft p-4"><p className="font-semibold text-ispec-success">تم حفظ التوصية محليًا فقط — تقديم التوصية الفعلي يقع ضمن صلاحيات مسؤول الجهة.</p></div>}
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="نقاط القوة"><textarea disabled={recommendationSubmitted} value={recommendation.strengths} onChange={(event) => setRecommendation((current) => ({ ...current, strengths: event.target.value }))} className={textareaClass}/></FormField>
          <FormField label="التحديات"><textarea disabled={recommendationSubmitted} value={recommendation.challenges} onChange={(event) => setRecommendation((current) => ({ ...current, challenges: event.target.value }))} className={textareaClass}/></FormField>
          <FormField label="المخاطر"><textarea disabled={recommendationSubmitted} value={recommendation.risks} onChange={(event) => setRecommendation((current) => ({ ...current, risks: event.target.value }))} className={textareaClass}/></FormField>
          <FormField label="التوصية النهائية">
            <select disabled={recommendationSubmitted} value={recommendation.decision} onChange={(event) => setRecommendation((current) => ({ ...current, decision: event.target.value }))} className={inputClass}>
              <option>موصى بالاعتماد</option><option>تحتاج تطوير قبل الاعتماد</option><option>موصى بعدم المتابعة حاليًا</option><option>تحتاج مراجعة إضافية</option>
            </select>
          </FormField>
          <div className="md:col-span-2"><FormField label="مبررات التوصية"><textarea disabled={recommendationSubmitted} value={recommendation.justification} onChange={(event) => setRecommendation((current) => ({ ...current, justification: event.target.value }))} className={textareaClass}/></FormField></div>
        </div>
        {!recommendationSubmitted && <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => showSuccess("تم حفظ مسودة التوصية محليًا.")}>حفظ كمسودة</Button>
          <Button onClick={submitRecommendation}><Send className="h-4 w-4"/>حفظ التوصية محليًا</Button>
        </div>}
      </Card>
    </div>}

    <Modal open={requestModal} title="طلب استكمال معلومات" onClose={() => setRequestModal(false)}>
      <div className="space-y-4">
        <FormField label="تفاصيل الطلب">
          <textarea value={requestText} onChange={(event) => setRequestText(event.target.value)} className={textareaClass} placeholder="اكتب المعلومات أو المستندات المطلوبة من المبتكر"/>
        </FormField>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="secondary" onClick={() => setRequestModal(false)} disabled={isSubmittingRequest}>إلغاء</Button>
          <Button onClick={sendRequest} disabled={isSubmittingRequest || !requestText.trim()}><Send className="h-4 w-4"/>{isSubmittingRequest ? "جارٍ الإرسال..." : "إرسال الطلب"}</Button>
        </div>
      </div>
    </Modal>
  </div>;
}
