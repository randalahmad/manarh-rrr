"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Avatar, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { Select, FormField, SearchInput, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ROLE_LABELS, USER_TYPE_LABELS, ACCOUNT_STATUS_LABELS, ACCOUNT_STATUS_TONE } from "@/lib/utils";
import { getCurrentOrgSession } from "@/lib/client/org-ideas";
import { fetchOrgMembers, updateOrgMember, setOrgMemberStatus } from "@/lib/client/org-users";
import type { User, UserRole } from "@/lib/types";

const roles: UserRole[] = ["ORG_ADMIN", "INNOVATION_SPECIALIST", "INTERNAL_INNOVATOR", "EXTERNAL_INNOVATOR", "EVALUATOR", "PROJECT_MANAGER"];

// Real, org-wide member listing (lib/client/org-users.ts, backed by new
// USER:VIEW/MANAGE/EDIT-gated actions) replacing the previous lib/store.tsx
// mock. "Add user" is intentionally disabled — see lib/server/services/
// org-users.ts's header for why (same session-hijack risk already
// investigated and blocked for bootstrapOrgAdmin()).
export default function UsersPage() {
  const { show } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [target, setTarget] = useState<User | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { organizationId: orgId } = await getCurrentOrgSession();
    const data = await fetchOrgMembers(orgId);
    return { orgId, data };
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then(({ orgId, data }) => {
        if (cancelled) return;
        setOrganizationId(orgId);
        setUsers(data);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (!search || `${u.fullName} ${u.email}`.toLowerCase().includes(search.toLowerCase())) &&
          (!role || u.role === role) &&
          (!status || u.status === status)
      ),
    [users, search, role, status]
  );

  const saveRole = async (nextRole: UserRole) => {
    if (!target || !organizationId) return;
    setSaving(true);
    try {
      const updated = await updateOrgMember(organizationId, target.id, { role: nextRole });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setTarget(null);
    } catch (err) {
      show(err instanceof Error ? err.message : "تعذر حفظ التعديل", "danger");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!target || !organizationId) return;
    setSaving(true);
    try {
      const nextStatus = target.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      const updated = await setOrgMemberStatus(organizationId, target.id, nextStatus, reason || undefined);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setReasonOpen(false);
      setTarget(null);
      setReason("");
    } catch (err) {
      show(err instanceof Error ? err.message : "تعذر تغيير الحالة", "danger");
    } finally {
      setSaving(false);
    }
  };

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل المستخدمين..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل المستخدمين"
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
        title="إدارة المستخدمين"
        description="إدارة أدوار وحالات أعضاء الجهة."
        actions={
          <Button disabled title="إضافة مستخدم جديد بانتظار آلية آمنة معتمدة من Neon لإنشاء الحسابات">
            إضافة مستخدم
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو البريد" />
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">كل الأدوار</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          {Object.entries(ACCOUNT_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="لا يوجد مستخدمون مطابقون" description="جرّبي تعديل كلمة البحث أو الفلاتر." />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b text-right text-xs">
                  <th className="p-3">المستخدم</th>
                  <th>نوع المستخدم</th>
                  <th>الدور</th>
                  <th>القسم</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--color-border-soft)]">
                    <td className="p-3">
                      <Link href={`/org/users/${u.id}`} className="flex items-center gap-2">
                        <Avatar name={u.fullName} size={32} imgUrl={u.avatarUrl} />
                        <span>
                          <b className="block text-[var(--color-ink)]">{u.fullName}</b>
                          <small className="text-[var(--color-ink-soft)]">{u.email}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <Badge tone="neutral">{USER_TYPE_LABELS[u.userType]}</Badge>
                    </td>
                    <td>
                      <Badge tone="primary">{ROLE_LABELS[u.role]}</Badge>
                    </td>
                    <td className="text-[var(--color-ink)]">{u.department ?? "—"}</td>
                    <td>
                      <StatusBadge label={ACCOUNT_STATUS_LABELS[u.status]} tone={ACCOUNT_STATUS_TONE[u.status]} />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => setTarget(u)}>
                          تعديل الدور
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTarget(u);
                            setReasonOpen(true);
                          }}
                        >
                          {u.status === "ACTIVE" ? "تعليق" : "تفعيل"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {target && !reasonOpen && (
        <Modal
          open
          onClose={() => setTarget(null)}
          title={`تعديل دور ${target.fullName}`}
          footer={
            <>
              <Button variant="outline" onClick={() => setTarget(null)}>
                إغلاق
              </Button>
            </>
          }
        >
          <FormField label="الدور التشغيلي" hint="تغيير الدور يُحدّث نطاق صلاحيات المستخدم فورًا.">
            <Select value={target.role} onChange={(e) => saveRole(e.target.value as UserRole)} disabled={saving}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </FormField>
        </Modal>
      )}

      <Modal
        open={reasonOpen}
        onClose={() => {
          setReasonOpen(false);
          setTarget(null);
        }}
        title={target?.status === "ACTIVE" ? "تعليق المستخدم" : "إعادة تفعيل المستخدم"}
        footer={
          <>
            <Button variant="outline" onClick={() => setReasonOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={changeStatus} loading={saving}>
              حفظ
            </Button>
          </>
        }
      >
        <FormField label="السبب / التعليق">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
      </Modal>
    </div>
  );
}
