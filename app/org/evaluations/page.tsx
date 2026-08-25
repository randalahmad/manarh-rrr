"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { Select, FormField, Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import type { Idea, EvaluatorAssignment, Evaluation } from "@/lib/types";
import { getCurrentOrgSession, fetchOrgIdeas, fetchUserNames } from "@/lib/client/org-ideas";
import { fetchOrgAssignments, fetchEvaluatorCandidates, fetchOrgEvaluations, assignEvaluator } from "@/lib/client/org-evaluations";

// Evaluator assignment — Phase 6, Group C. Reads/mutations below are real
// (idea_evaluator_assignments / evaluations via the real backend). The
// evaluator picker is restricted server-side to EVALUATOR/INNOVATION_SPECIALIST
// members (see listEvaluatorCandidates), matching what this page's mock
// picker used to filter for locally.
type EvaluatorCandidate = { id: string; fullName: string };

type LoadedData = {
  organizationId: string;
  ideas: Idea[];
  assignments: EvaluatorAssignment[];
  evaluations: Evaluation[];
  candidates: EvaluatorCandidate[];
  names: Map<string, string>;
};

export default function EvaluationsPage() {
  const [data, setData] = useState<LoadedData | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async (): Promise<LoadedData> => {
    const { organizationId } = await getCurrentOrgSession();
    const [ideas, assignments, evaluations, candidates] = await Promise.all([
      fetchOrgIdeas(organizationId),
      fetchOrgAssignments(organizationId),
      fetchOrgEvaluations(organizationId),
      fetchEvaluatorCandidates(organizationId),
    ]);
    const names = await fetchUserNames(assignments.map((a) => a.evaluatorId));
    return { organizationId, ideas, assignments, evaluations, candidates, names };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadData()
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
  }, [loadData, reloadKey]);

  const retry = () => {
    setLoadState("loading");
    setReloadKey((k) => k + 1);
  };

  const [open, setOpen] = useState(false);
  const [ideaId, setIdeaId] = useState("");
  const [evaluatorId, setEvaluatorId] = useState("");
  const [due, setDue] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  const rows = useMemo(() => {
    if (!data) return [];
    return data.assignments.map((a) => ({
      a,
      idea: data.ideas.find((i) => i.id === a.ideaId),
      evaluatorName: data.names.get(a.evaluatorId),
      evaluation: data.evaluations.find((e) => e.ideaId === a.ideaId && e.evaluatorId === a.evaluatorId),
    }));
  }, [data]);

  const handleAssign = async () => {
    if (!ideaId || !evaluatorId) return;
    setIsAssigning(true);
    setAssignError("");
    try {
      await assignEvaluator(ideaId, evaluatorId, due || undefined);
      setOpen(false);
      setIdeaId("");
      setEvaluatorId("");
      setDue("");
      const loaded = await loadData();
      setData(loaded);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "تعذر تعيين المقيّم.");
    } finally {
      setIsAssigning(false);
    }
  };

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل بيانات التقييم..." />;
  if (loadState === "error" || !data) {
    return (
      <EmptyState
        title="تعذر تحميل بيانات التقييم"
        description="حدث خطأ أثناء الاتصال بالخادم."
        action={<Button variant="outline" onClick={retry}>إعادة المحاولة</Button>}
      />
    );
  }

  const assignableIdeas = data.ideas.filter((i) => ["UNDER_REVIEW", "RETURNED_FOR_REVIEW", "UNDER_EVALUATION"].includes(i.status));

  return (
    <div>
      <PageHeader
        title="التقييم وتعيين المقيمين"
        description="تعيين المقيمين، متابعة المواعيد، نتائج التقييم، ومنع التقييم الذاتي."
        actions={<Button onClick={() => setOpen(true)}>تعيين مقيم</Button>}
      />
      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b text-right text-xs">
                <th className="p-3">الفكرة</th><th>المقيّم</th><th>الحالة</th><th>الاستحقاق</th><th>النتيجة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, idea, evaluatorName, evaluation }) => (
                <tr key={a.id} className="border-b border-[var(--color-border-soft)]">
                  <td className="p-3 font-medium">{idea?.title ?? "—"}</td>
                  <td>{evaluatorName ?? "—"}</td>
                  <td><Badge tone={a.status === "OVERDUE" ? "danger" : a.status === "COMPLETED" ? "success" : "warning"}>{a.status}</Badge></td>
                  <td>{a.dueAt ? new Date(a.dueAt).toLocaleDateString("ar-SA") : "—"}</td>
                  <td>{evaluation ? `${((evaluation.strategicAlignmentScore + evaluation.feasibilityScore + evaluation.resourceReadinessScore) / 3).toFixed(1)} / 10` : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="p-3 text-sm text-[var(--color-ink-soft)]" colSpan={5}>لا توجد تعيينات تقييم بعد.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="تعيين مقيم"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isAssigning}>إلغاء</Button>
            <Button onClick={handleAssign} disabled={isAssigning || !ideaId || !evaluatorId}>
              {isAssigning ? "جارٍ التعيين..." : "تعيين"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {assignError && <p className="text-sm text-[var(--color-danger)]">{assignError}</p>}
          <FormField label="الفكرة">
            <Select value={ideaId} onChange={(e) => setIdeaId(e.target.value)}>
              <option value="">اختر</option>
              {assignableIdeas.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
            </Select>
          </FormField>
          <FormField label="المقيّم">
            <Select value={evaluatorId} onChange={(e) => setEvaluatorId(e.target.value)}>
              <option value="">اختر</option>
              {data.candidates.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </Select>
          </FormField>
          <FormField label="تاريخ الاستحقاق">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
