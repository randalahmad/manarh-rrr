"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ban, CheckCircle2, Save, Lightbulb, FolderKanban } from "lucide-react";
import { useAppData } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { PageHeader, Card, Avatar, EmptyState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/form";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/modal";
import type { UserRole } from "@/lib/types";
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

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { users, ideas, projects, projectMembers, updateUser, setUserStatus } = useAppData();
  const { show } = useToast();

  const user = users.find((u) => u.id === id);
  const [tab, setTab] = useState("overview");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [role, setRole] = useState<UserRole>((user?.role as UserRole) ?? "INTERNAL_INNOVATOR");

  const userIdeas = useMemo(() => ideas.filter((i) => i.submitterId === id), [ideas, id]);
  const userProjectIds = useMemo(() => projectMembers.filter((pm) => pm.userId === id).map((pm) => pm.projectId), [projectMembers, id]);
  const userProjects = useMemo(() => projects.filter((p) => userProjectIds.includes(p.id)), [projects, userProjectIds]);

  if (!user) {
    return (
      <EmptyState
        title="المستخدم غير موجود"
        description="ربما تم حذف الحساب أو أن الرابط غير صحيح."
        action={<Button variant="outline" onClick={() => router.push("/org/users")}>العودة لقائمة المستخدمين</Button>}
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
            <Button
              variant="outline"
              icon={<CheckCircle2 size={16} />}
              onClick={() => {
                setUserStatus(user.id, "ACTIVE", "User Enabled");
                show("تم تفعيل الحساب");
              }}
            >
              إعادة تفعيل الحساب
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="flex flex-col items-center gap-3 text-center lg:col-span-1">
          <Avatar name={user.fullName} size={72} />
          <div>
            <p className="font-display text-lg font-bold text-[var(--color-ink)]">{user.fullName}</p>
            <p className="text-sm text-[var(--color-ink-soft)]">{user.jobTitle}</p>
            <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">{user.department}</p>
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
                    <FormField label="المسمى الوظيفي">
                      <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                    </FormField>
                    <FormField label="الإدارة">
                      <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
                    </FormField>
                  </div>
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
                  <div>
                    <Button
                      icon={<Save size={16} />}
                      onClick={() => {
                        updateUser(user.id, { jobTitle, department, role });
                        show("تم حفظ تعديلات الحساب");
                      }}
                    >
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
        onConfirm={() => {
          setUserStatus(user.id, "DISABLED", "User Disabled");
          show("تم تعطيل الحساب", "danger");
          setConfirmOpen(false);
        }}
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
