"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { SearchInput, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { DECISION_TYPE_LABELS } from "@/lib/utils";
import type { Idea, Evaluation, Recommendation, Decision } from "@/lib/types";
import { getCurrentOrgSession, fetchOrgIdeas } from "@/lib/client/org-ideas";
import { fetchOrgEvaluations, fetchOrgRecommendations, fetchOrgDecisions } from "@/lib/client/org-evaluations";

const LISTED_STATUSES = [
  "RECOMMENDATION_SUBMITTED", "PENDING_DECISION", "APPROVED", "CONDITIONALLY_APPROVED",
  "DEFERRED", "REJECTED", "NEEDS_INFORMATION", "CONVERTED_TO_PROJECT",
];

type LoadedData = {
  ideas: Idea[];
  evaluations: Evaluation[];
  recommendations: Recommendation[];
  decisions: Decision[];
};

export default function DecisionsPage() {
  const [data, setData] = useState<LoadedData | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  // Captured once via useState's lazy initializer instead of calling
  // Date.now() directly in the render body (react-hooks/purity), and to
  // avoid a hydration mismatch — see the equivalent note this page already
  // carried before Group C.
  const [now] = useState(() => Date.now());

  const loadData = useCallback(async (): Promise<LoadedData> => {
    const { organizationId } = await getCurrentOrgSession();
    const [ideas, evaluations, recommendations, decisions] = await Promise.all([
      fetchOrgIdeas(organizationId),
      fetchOrgEvaluations(organizationId),
      fetchOrgRecommendations(organizationId),
      fetchOrgDecisions(organizationId),
    ]);
    return { ideas, evaluations, recommendations, decisions };
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

  const rows = useMemo(() => {
    if (!data) return [];
    return data.ideas
      .filter((i) => LISTED_STATUSES.includes(i.status))
      .filter((i) => !search || i.title.toLowerCase().includes(search.toLowerCase()))
      .filter((i) => !status || i.status === status);
  }, [data, search, status]);

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل قائمة القرارات..." />;
  if (loadState === "error" || !data) {
    return (
      <EmptyState
        title="تعذر تحميل قائمة القرارات"
        description="حدث خطأ أثناء الاتصال بالخادم."
        action={<Button variant="outline" onClick={retry}>إعادة المحاولة</Button>}
      />
    );
  }

  return (
    <div>
      <PageHeader title="قائمة القرارات" description="التقييم والتوصية وحالة الانتظار ووقت القرار، مع سجل القرار والملاحظات والمرفقات." />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <SearchInput value={search} onChange={setSearch} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          <option value="PENDING_DECISION">بانتظار القرار</option>
          <option value="RECOMMENDATION_SUBMITTED">توصية مرفوعة</option>
          <option value="APPROVED">معتمد</option>
          <option value="CONDITIONALLY_APPROVED">اعتماد مشروط</option>
          <option value="DEFERRED">مؤجل</option>
          <option value="REJECTED">مرفوض</option>
        </Select>
      </div>
      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-sm">
            <thead>
              <tr className="border-b text-right text-xs">
                <th className="p-3">الفكرة</th><th>التقييم</th><th>التوصية</th><th>القرار</th><th>وقت الانتظار</th><th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const ev = data.evaluations.filter((e) => e.ideaId === i.id);
                const rec = data.recommendations.find((r) => r.ideaId === i.id);
                const dec = data.decisions.find((x) => x.ideaId === i.id);
                const days = Math.max(0, Math.floor((now - new Date(i.updatedAt).getTime()) / 86400000));
                return (
                  <tr key={i.id} className="border-b">
                    <td className="p-3"><b>{i.title}</b></td>
                    <td>{ev.length ? `${ev.length} مكتمل` : "—"}</td>
                    <td>{rec ? <Badge tone="beacon">{DECISION_TYPE_LABELS[rec.recommendationType]}</Badge> : "—"}</td>
                    <td>{dec ? <Badge tone={dec.decisionType === "REJECT" ? "danger" : "success"}>{DECISION_TYPE_LABELS[dec.decisionType]}</Badge> : <Badge tone="warning">بانتظار القرار</Badge>}</td>
                    <td>{days} يوم</td>
                    <td><Link className="text-[var(--color-primary)] hover:underline" href={`/org/decisions/${i.id}`}>التفاصيل / القرار</Link></td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td className="p-3 text-sm text-[var(--color-ink-soft)]" colSpan={6}>لا توجد أفكار في هذه المرحلة بعد.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
