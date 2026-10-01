"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { Input, FormField, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { getCurrentOrgSession } from "@/lib/client/org-ideas";
import { fetchOrgOpportunities, createOrgOpportunity, archiveOrgOpportunity } from "@/lib/client/org-opportunities";
import { fetchOrgStrategicGoals } from "@/lib/client/org-strategic-goals";
import type { InnovationOpportunity, StrategicGoal } from "@/lib/types";

// Real list/create/archive — exact structural mirror of app/org/challenges/page.tsx.
export default function OpportunitiesPage() {
  const { show } = useToast();
  const [opportunities, setOpportunities] = useState<InnovationOpportunity[]>([]);
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
    const [opportunitiesData, goalsData] = await Promise.all([
      fetchOrgOpportunities(orgId),
      fetchOrgStrategicGoals(orgId),
    ]);
    return { orgId, opportunitiesData, goalsData };
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then(({ orgId, opportunitiesData, goalsData }) => {
        if (cancelled) return;
        setOrganizationId(orgId);
        setOpportunities(opportunitiesData);
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
      const created = await createOrgOpportunity({
        organizationId,
        title,
        description,
        strategicGoalId: goal || undefined,
        priority: opportunities.length + 1,
      });
      setOpportunities((prev) => [created, ...prev]);
      setOpen(false);
      setTitle("");
      setDescription("");
      setGoal("");
    } catch (err) {
      show(err instanceof Error ? err.message : "تعذر إنشاء الفرصة", "danger");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (id: string) => {
    setArchivingId(id);
    try {
      const updated = await archiveOrgOpportunity(id);
      setOpportunities((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      show(err instanceof Error ? err.message : "تعذر أرشفة الفرصة", "danger");
    } finally {
      setArchivingId(null);
    }
  };

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل الفرص..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل الفرص"
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
        title="الفرص الابتكارية"
        description="إدارة الفرص وربطها بالأهداف الاستراتيجية وقياس الاستخدام."
        actions={<Button onClick={() => setOpen(true)}>إضافة فرصة</Button>}
      />

      {opportunities.length === 0 ? (
        <EmptyState icon={Sparkles} title="لا توجد فرص بعد" description="ابدئي بإضافة أول فرصة ابتكارية." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {opportunities.map((c) => (
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
        title="إضافة فرصة"
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
