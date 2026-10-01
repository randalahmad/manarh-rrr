"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ban, CheckCircle2, Save, Lightbulb, FolderKanban } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { PageHeader, Card, Avatar, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/form";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/modal";
import type { User, UserRole, Idea, Project } from "@/lib/types";
import { getCurrentOrgSession, fetchOrgIdeas } from "@/lib/client/org-ideas";
import { fetchOrgProjects } from "@/lib/client/org-projects";
import { fetchOrgMember, updateOrgMember, setOrgMemberStatus } from "@/lib/client/org-users";
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUS_TONE,
  ROLE_LABELS,
  IDEA_STATUS_LABELS,
  IDEA_STATUS_TONE,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONE,
  formatDate,
  timeAgo,
} from "@/lib/utils";

const ASSIGNABLE_ROLES: UserRole[] = ["ORG_ADMIN", "INNOVATION_SPECIALIST", "INTERNAL_INNOVATOR"];

// Real member profile (lib/client/org-users.ts) replacing the previous
// lib/store.tsx mock. "Projects" is approximated as projects this user
// owns (real owner_id) — the mock's broader "project member" concept has
// no wired real list function yet, documented rather than fabricated.
export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { show } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "notfound" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState("overview");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<UserRole>("INTERNAL_INNOVATOR");

  const load = useCallback(async () => {
    const { organizationId: orgId } = await getCurrentOrgSession();
    const [memberData, ideasData, projectsData] = await Promise.all([
      fetchOrgMember(orgId, id),
      fetchOrgIdeas(orgId),
      fetchOrgProjects(orgId),
    ]);
    return { orgId, memberData, ideasData, projectsData };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    load()
      .then(({ orgId, memberData, ideasData, projectsData }) => {
        if (cancelled) return;
        setOrganizationId(orgId);
        setUser(memberData);
        setDepartment(memberData.department ?? "");
        setRole(memberData.role);
        setIdeas(ideasData);
        setProjects(projectsData);
        setLoadState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadState(err?.message?.includes("Membership") ? "notfound" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const userIdeas = useMemo(() => ideas.filter((i) => i.submitterId === id), [ideas, id]);
  const userProjects = useMemo(() => projects.filter((p) => p.ownerId === id), [projects, id]);

  const saveEdits = async () => {
    if (!user || !organizationId) return;
    setSaving(true);
    try {
      const updated = await updateOrgMember(organizationId, user.id, { department, role });
      setUser(updated);
      show("تم حفظ تعديلات الحساب");
    } catch (err) {
      show(err instanceof Error ? err.message : "تعذر حفظ التعديلات", "danger");
    } finally {
      setSaving(false);
    }
  };

  const toggleDisable = async () => {
    if (!user || !organizationId) return;
    setSaving(true);
    try {
      const nextStatus = user.status === "DISABLED" ? "ACTIVE" : "DISABLED";
      const updated = await setOrgMemberStatus(organizationId, user.id, nextStatus);
      setUser(updated);
      show(nextStatus === "ACTIVE" ? "تم تفعيل الحساب" : "تم تعطيل الحساب", nextStatus === "ACTIVE" ? "success" : "danger");
    } catch (err) {
      show(err instanceof Error ? err.message : "تعذر تغيير حالة الحساب", "danger");
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل بيانات المستخدم..." />;
  if (loadState === "notfound" || (!user && loadState === "ready")) {
    return (
      <EmptyState
        title="المستخدم غير موجود"
        description="ربما تم حذف الحساب أو أن الرابط غير صحيح."
        action={
          <Button variant="outline" onClick={() => router.push("/org/users")}>
            العودة لقائمة المستخدمين
          </Button>
        }
      />
    );
  }
  if (loadState === "error" || !user) {
    return (
      <EmptyState
        title="تعذر تحميل بيانات المستخدم"
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

  const canAssignRole = ASSIGNABLE_ROLES.includes(user.role);

  return (
    <div>
      <PageHeader
        title={user.fullName}
        breadcrumbs={[{ label: "لوحة التحكم", href: "/org/dashboard" }, { label: "المستخدمون", href: "/org/users" }, { label: user.fullName }]}
        actions={
          user.status !== "DISABLED" ? (
            <Button variant="danger" icon={<Ban size={16} />} onClick={() => setConfirmOpen(true)}>
              تعطيل الحساب
            </Button>
          ) : (
            <Button variant="outline" icon={<CheckCircle2 size={16} />} onClick={toggleDisable}>
              إعادة تفعيل الحساب
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="flex flex-col items-center gap-3 text-center lg:col-span-1">
          <Avatar name={user.fullName} size={72} imgUrl={user.avatarUrl} />
          <div>
            <p className="font-display text-lg font-bold text-[var(--color-ink)]">{user.fullName}</p>
            <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">{user.department ?? "—"}</p>
          </div>
          <div className="flex gap-2">
            <Badge tone="primary">{ROLE_LABELS[user.role]}</Badge>
            <StatusBadge label={ACCOUNT_STATUS_LABELS[user.status]} tone={ACCOUNT_STATUS_TONE[user.status]} />
          </div>
          <div className="w-full border-t border-[var(--color-border-soft)] pt-3 text-right text-sm">
            <Row label="البريد الإلكتروني" value={user.email} mono />
            <Row label="رقم الجوال" value={user.phone ?? "—"} mono />
            <Row label="تاريخ الإضافة" value={formatDate(user.createdAt)} />
            <Row label="آخر نشاط" value={user.lastActivityAt ? timeAgo(user.lastActivityAt) : "—"} />
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card padded={false}>
            <div className="px-2">
              <Tabs
                tabs={[
                  { id: "overview", label: "نظرة عامة" },
                  { id: "ideas", label: "الأفكار المقدَّمة", count: userIdeas.length },
                  { id: "projects", label: "المشاريع", count: userProjects.length },
                  { id: "edit", label: "تعديل الحساب" },
                ]}
                onChange={setTab}
              />
            </div>
            <div className="p-5">
              {tab === "overview" && (
                <div className="grid grid-cols-3 gap-3">
                  <MiniStat label="أفكار مقدَّمة" value={user.ideasSubmitted ?? userIdeas.length} />
                  <MiniStat label="أفكار معتمدة" value={user.ideasApproved ?? userIdeas.filter((i) => i.status === "APPROVED").length} />
                  <MiniStat label="مشاركات في مشاريع" value={user.projectsInvolved ?? userProjects.length} />
                </div>
              )}

              {tab === "ideas" && (
                <div className="space-y-2.5">
                  {userIdeas.length === 0 && <EmptyState icon={Lightbulb} title="لا توجد أفكار مقدَّمة من هذا المستخدم بعد" />}
                  {userIdeas.map((idea) => (
                    <a
                      key={idea.id}
                      href={`/org/ideas/${idea.id}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border-soft)] p-3 hover:bg-[var(--color-surface-sunken)]/50"
                    >
                      <span className="truncate text-sm font-medium text-[var(--color-ink)]">{idea.title}</span>
                      <StatusBadge label={IDEA_STATUS_LABELS[idea.status]} tone={IDEA_STATUS_TONE[idea.status]} />
                    </a>
                  ))}
                </div>
              )}

              {tab === "projects" && (
                <div className="space-y-2.5">
                  {userProjects.length === 0 && <EmptyState icon={FolderKanban} title="لا توجد مشاركات في مشاريع بعد" />}
                  {userProjects.map((p) => (
                    <a
                      key={p.id}
                      href={`/org/projects/${p.id}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border-soft)] p-3 hover:bg-[var(--color-surface-sunken)]/50"
                    >
                      <span className="truncate text-sm font-medium text-[var(--color-ink)]">{p.name}</span>
                      <StatusBadge label={PROJECT_STATUS_LABELS[p.status]} tone={PROJECT_STATUS_TONE[p.status]} />
                    </a>
                  ))}
                </div>
              )}

              {tab === "edit" && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="القسم">
                      <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
                    </FormField>
                    {canAssignRole && (
                      <FormField label="الدور" hint="تغيير الدور يُحدّث نطاق صلاحيات المستخدم فورًا.">
                        <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    )}
                  </div>
                  <div>
                    <Button icon={<Save size={16} />} onClick={saveEdits} loading={saving}>
                      حفظ التعديلات
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={toggleDisable}
        title={`تعطيل حساب ${user.fullName}`}
        description="لن يتمكن هذا المستخدم من الدخول إلى المنصة حتى تتم إعادة تفعيل حسابه."
        confirmLabel="تعطيل الحساب"
      />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-[var(--color-ink-soft)]">{label}</span>
      <span className={`text-xs font-medium text-[var(--color-ink)] ${mono ? "font-mono-num" : ""}`}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border-soft)] p-4 text-center">
      <p className="font-mono-num text-2xl font-bold text-[var(--color-ink)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{label}</p>
    </div>
  );
}
