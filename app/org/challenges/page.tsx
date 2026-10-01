"use client";

import { useCallback, useEffect, useState } from "react";
import { Radar } from "lucide-react";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { Input, FormField, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { getCurrentOrgSession } from "@/lib/client/org-ideas";
import { fetchOrgChallenges, createOrgChallenge, archiveOrgChallenge } from "@/lib/client/org-challenges";
import { fetchOrgStrategicGoals } from "@/lib/client/org-strategic-goals";
import type { InnovationChallenge, StrategicGoal } from "@/lib/types";

// Real list/create/archive (lib/client/org-challenges.ts, backed by new
// CHALLENGE:VIEW/CREATE/EDIT-gated actions — no new permission invented)
// replacing the previous lib/store.tsx mock. Same content/fields as before;
// only `categoryIds`/linkage badges are absent (no real join-table data yet).
export default function ChallengesPage() {
  const { show } = useToast();
  const [challenges, setChallenges] = useState<InnovationChallenge[]>([]);
  const [goals, setGoals] = useState<StrategicGoal[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { organizationId: orgId } = await getCurrentOrgSession();
    const [challengesData, goalsData] = await Promise.all([
      fetchOrgChallenges(orgId),
      fetchOrgStrategicGoals(orgId),
    ]);
    return { orgId, challengesData, goalsData };
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then(({ orgId, challengesData, goalsData }) => {
        if (cancelled) return;
        setOrganizationId(orgId);
        setChallenges(challengesData);
        setGoals(goalsData);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const save = async () => {
    if (!title.trim() || !organizationId) return;
    setSaving(true);
    try {
      const created = await createOrgChallenge({
        organizationId,
        title,
        description,
        strategicGoalId: goal || undefined,
        priority: challenges.length + 1,
      });
      setChallenges((prev) => [created, ...prev]);
      setOpen(false);
      setTitle("");
      setDescription("");
      setGoal("");
    } catch (err) {
      show(err instanceof Error ? err.message : "تعذر إنشاء التحدي", "danger");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (id: string) => {
    setArchivingId(id);
    try {
      const updated = await archiveOrgChallenge(id);
      setChallenges((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      show(err instanceof Error ? err.message : "تعذر أرشفة التحدي", "danger");
    } finally {
      setArchivingId(null);
    }
  };

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل التحديات..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل التحديات"
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
      <PageHeader
        title="التحديات الابتكارية"
        description="إدارة التحديات وربطها بالأهداف الاستراتيجية وقياس الاستخدام."
        actions={<Button onClick={() => setOpen(true)}>إضافة تحدي</Button>}
      />

      {challenges.length === 0 ? (
        <EmptyState icon={Radar} title="لا توجد تحديات بعد" description="ابدئي بإضافة أول تحدٍ ابتكاري." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {challenges.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-[var(--color-ink)]">{c.title}</h3>
                  <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{c.description}</p>
                </div>
                <Badge tone={c.status === "ARCHIVED" ? "neutral" : "success"}>{c.status}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-[var(--color-surface-sunken)] p-2 text-[var(--color-ink)]">
                  <b>{c.linkedIdeasCount}</b>
                  <br />
                  أفكار
                </div>
                <div className="rounded-lg bg-[var(--color-surface-sunken)] p-2 text-[var(--color-ink)]">
                  <b>{c.usageCount ?? 0}</b>
                  <br />
                  استخدام
                </div>
                <div className="rounded-lg bg-[var(--color-surface-sunken)] p-2 text-[var(--color-ink)]">
                  <b>{goals.find((g) => g.id === c.strategicGoalId)?.name ?? "—"}</b>
                  <br />
                  هدف
                </div>
              </div>
              {c.status !== "ARCHIVED" && (
                <Button
                  className="mt-4"
                  variant="outline"
                  size="sm"
                  loading={archivingId === c.id}
                  onClick={() => archive(c.id)}
                >
                  أرشفة
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="إضافة تحدي"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={save} loading={saving}>
              حفظ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="العنوان">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label="الوصف">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
          <FormField label="الهدف الاستراتيجي">
            <Select value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="">بدون</option>
              {goals
                .filter((g) => g.status === "ACTIVE")
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </Select>
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
