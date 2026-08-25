"use client";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField, Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import type { StrategicGoal } from "@/lib/types";
import { getCurrentOrgSession, fetchUserNames } from "@/lib/client/org-ideas";
import { fetchOrgStrategicGoals, createOrgStrategicGoal } from "@/lib/client/org-strategic-goals";

/**
 * Strategic Goals — Phase 6, Group F. List + create are real
 * (lib/client/org-strategic-goals.ts), gated ORG:MANAGE server-side.
 *
 * KNOWN GAPS (approved, not invented around):
 *  - No edit/archive UI existed in the pre-existing mock to wire — this
 *    stays list + create only, matching the approved scope.
 *  - Idea/project <-> strategic-goal linkage is explicitly deferred, so
 *    "الأفكار"/"المشاريع" read the real (always-0-for-now)
 *    `linked_ideas_count`/`linked_projects_count` columns rather than
 *    being computed against the unrelated mock ideas/projects arrays.
 *    "قياسات الأثر" (impact measurements), which the old mock UI derived
 *    from that same cross-reference, is dropped — no real equivalent
 *    exists without the linkage.
 *  - The create form only collects fields the real `createStrategicGoal`
 *    service persists (name, description, targetValue, unit) — the old
 *    mock form's currentValue/measurement-period/owner fields were
 *    removed rather than sent to a field the backend doesn't accept on
 *    create. Owner is not settable here: Users/Team management is itself
 *    still a mock-only domain (app/org/users/page.tsx), so there is no
 *    real, authorized way yet to enumerate org members for a picker.
 */
export default function StrategicGoalsPage() {
  const [goals, setGoals] = useState<StrategicGoal[]>([]);
  const [ownerNames, setOwnerNames] = useState<Map<string, string>>(new Map());
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("100");
  const [unit, setUnit] = useState("%");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    const fetchedGoals = await fetchOrgStrategicGoals(organizationId);
    const names = await fetchUserNames(
      fetchedGoals.map((g) => g.ownerId).filter((id): id is string => Boolean(id))
    );
    return { organizationId, goals: fetchedGoals, names };
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled) return;
        setOrgId(data.organizationId);
        setGoals(data.goals);
        setOwnerNames(data.names);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const retry = () => {
    setLoadState("loading");
    setReloadKey((k) => k + 1);
  };

  const save = async () => {
    if (!name.trim() || !orgId) return;
    setSaving(true);
    try {
      await createOrgStrategicGoal({
        organizationId: orgId,
        name,
        description: desc,
        targetValue: target ? Number(target) : undefined,
        unit: unit || undefined,
      });
      setOpen(false);
      setName("");
      setDesc("");
      setTarget("100");
      setUnit("%");
      setReloadKey((k) => k + 1);
    } finally {
      setSaving(false);
    }
  };

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل الأهداف الاستراتيجية..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل الأهداف الاستراتيجية"
        description="حدث خطأ أثناء الاتصال بالخادم."
        action={<Button variant="outline" onClick={retry}>إعادة المحاولة</Button>}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="الأهداف الاستراتيجية"
        description="إنشاء وقياس الأهداف الاستراتيجية مع المالك والقيمة المستهدفة والحالية."
        actions={<Button onClick={() => setOpen(true)}>إضافة هدف</Button>}
      />
      {goals.length === 0 ? (
        <EmptyState title="لا توجد أهداف استراتيجية" description="لم يتم إضافة أي هدف استراتيجي بعد." />
      ) : (
        <div className="grid gap-4">
          {goals.map((g) => (
            <Card key={g.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{g.name}</h3>
                  <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{g.description}</p>
                </div>
                <Badge tone={g.status === "ACTIVE" ? "success" : "neutral"}>{g.status}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
                <Metric label="المستهدف" value={`${g.targetValue ?? "—"} ${g.unit ?? ""}`} />
                <Metric label="الحالي" value={`${g.currentValue ?? "—"} ${g.unit ?? ""}`} />
                <Metric label="التقدم" value={`${g.progressPercentage ?? 0}%`} />
                <Metric label="الأفكار" value={g.linkedIdeasCount} />
                <Metric label="المشاريع" value={g.linkedProjectsCount ?? 0} />
              </div>
              <div className="mt-3 text-xs text-[var(--color-ink-soft)]">
                المالك: {g.ownerId ? ownerNames.get(g.ownerId) ?? "—" : "—"}
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="إضافة هدف استراتيجي"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving || !name.trim()}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="الاسم">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="الوصف">
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </FormField>
          <FormField label="القيمة المستهدفة">
            <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
          </FormField>
          <FormField label="الوحدة">
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-[var(--color-surface-sunken)] p-3 text-center">
      <b>{value}</b>
      <div className="text-xs text-[var(--color-ink-soft)]">{label}</div>
    </div>
  );
}
