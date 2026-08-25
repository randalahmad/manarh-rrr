"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Lightbulb,
  FolderKanban,
  Building2,
  UserRound,
  Target,
  Sparkles,
  ClipboardCheck,
  ListTodo,
  TrendingUp,
} from "lucide-react";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { cn, timeAgo } from "@/lib/utils";
import type { Notification, NotificationEntityType } from "@/lib/types";
import { getCurrentOrgSession } from "@/lib/client/org-ideas";
import { fetchMyNotifications, markMyNotificationRead, markAllMyNotificationsRead } from "@/lib/client/org-notifications";

const ENTITY_ICON: Record<NotificationEntityType, typeof Lightbulb> = {
  IDEA: Lightbulb,
  DECISION: Lightbulb,
  PROJECT: FolderKanban,
  USER: UserRound,
  ORGANIZATION: Building2,
  CHALLENGE: Target,
  OPPORTUNITY: Sparkles,
  EVALUATION: ClipboardCheck,
  TASK: ListTodo,
  IMPACT: TrendingUp,
};

function entityHref(type: NotificationEntityType, id: string): string {
  switch (type) {
    case "IDEA":
      return `/org/ideas/${id}`;

    case "DECISION":
      return `/org/decisions/${id}`;

    case "PROJECT":
      return `/org/projects/${id}`;

    case "USER":
      return `/org/users/${id}`;

    case "ORGANIZATION":
      return `/org/settings`;

    case "CHALLENGE":
      return `/org/challenges`;

    case "OPPORTUNITY":
      return `/org/opportunities`;

    case "EVALUATION":
      return `/org/evaluations`;

    case "TASK":
      return `/org/my-tasks`;

    case "IMPACT":
      return `/org/impact`;

    default:
      return `/org/notifications`;
  }
}

// Phase 6, Group F — real notifications (lib/client/org-notifications.ts),
// scoped server-side to the authenticated actor's own recipient_id.
export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const unread = notifications.filter((n) => !n.isRead).length;

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    const items = await fetchMyNotifications(organizationId);
    return { organizationId, items };
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled) return;
        setOrgId(data.organizationId);
        setNotifications(data.items);
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

  const handleOpen = async (n: Notification) => {
    if (!n.isRead) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      markMyNotificationRead(n.id).catch(() => setReloadKey((k) => k + 1));
    }
    router.push(entityHref(n.entityType, n.entityId));
  };

  const handleMarkAllRead = async () => {
    if (!orgId) return;
    setMarkingAll(true);
    try {
      await markAllMyNotificationsRead(orgId);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } finally {
      setMarkingAll(false);
    }
  };

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل الإشعارات..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل الإشعارات"
        description="حدث خطأ أثناء الاتصال بالخادم."
        action={<Button variant="outline" onClick={retry}>إعادة المحاولة</Button>}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="الإشعارات"
        description="جميع الإشعارات والتحديثات المتعلقة بالأفكار والمشاريع والمستخدمين."
        breadcrumbs={[{ label: "لوحة التحكم", href: "/org/dashboard" }, { label: "الإشعارات" }]}
        actions={
          unread > 0 && (
            <Button variant="outline" onClick={handleMarkAllRead} disabled={markingAll}>
              {markingAll ? "جارٍ التحديث..." : `تعليم الكل كمقروء (${unread})`}
            </Button>
          )
        }
      />

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="لا توجد إشعارات" description="ستظهر هنا التحديثات المتعلقة بنشاطك داخل المنصة." />
      ) : (
        <Card padded={false} className="divide-y divide-[var(--color-border-soft)]">
          {notifications.map((n) => {
            const Icon = ENTITY_ICON[n.entityType];
            return (
              <button
                key={n.id}
                onClick={() => handleOpen(n)}
                className={cn(
                  "flex w-full items-start gap-3 px-5 py-4 text-right hover:bg-[var(--color-surface-sunken)]/50",
                  !n.isRead && "bg-[var(--color-beacon-soft)]/20"
                )}
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <Icon size={17} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-[var(--color-ink)]">{n.title}</span>
                  <span className="mt-1 block text-sm text-[var(--color-ink-soft)]">{n.message}</span>
                  <span className="mt-1.5 block text-xs text-[var(--color-ink-soft)]/70">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.isRead && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-beacon)]" />}
              </button>
            );
          })}
        </Card>
      )}
    </div>
  );
}
