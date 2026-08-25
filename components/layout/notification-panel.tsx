"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { timeAgo, cn } from "@/lib/utils";
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

// Phase 6, Group F: previously only handled 4 of the 10 real entity types
// (IDEA/DECISION/PROJECT/USER/ORGANIZATION were the only cases — everything
// else fell through to `undefined`, silently defaulting to
// `/org/notifications` at the call site). Fixed to match the full
// notifications page's (app/org/notifications/page.tsx) complete switch —
// same routing rule, no new routes invented.
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

// Phase 6, Group F — real notifications (lib/client/org-notifications.ts).
// Rendered by the shared Header/AppShell, reached by both the Org Admin
// and Innovation Specialist layouts — getCurrentOrgSession() resolves the
// signed-in actor's own org membership regardless of which interface.
export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [open, setOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
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
      })
      .catch(() => {
        // Silently skip — the bell degrades to empty rather than breaking the header.
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleOpenNotification = (n: Notification) => {
    setOpen(false);
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="الإشعارات"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-sunken)]"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute top-1 left-1.5 flex h-2 w-2 rounded-full bg-[var(--color-beacon)] ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-30 w-[340px] max-w-[85vw] rounded-2xl border border-[var(--color-border-soft)] bg-white shadow-[var(--shadow-popover)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-4 py-3">
            <p className="font-display text-sm font-bold text-[var(--color-ink)]">الإشعارات</p>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-xs font-medium text-[var(--color-primary)] hover:underline disabled:opacity-60"
              >
                تعليم الكل كمقروء
              </button>
            )}
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-[var(--color-ink-soft)]">لا توجد إشعارات حاليًا</p>
            )}
            {notifications.slice(0, 8).map((n) => {
              const Icon = ENTITY_ICON[n.entityType];
              return (
                <button
                  key={n.id}
                  onClick={() => handleOpenNotification(n)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-[var(--color-border-soft)] px-4 py-3 text-right last:border-0 hover:bg-[var(--color-surface-sunken)]/60",
                    !n.isRead && "bg-[var(--color-beacon-soft)]/25"
                  )}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <Icon size={15} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-[var(--color-ink)]">{n.title}</span>
                    <span className="mt-0.5 block text-xs text-[var(--color-ink-soft)] line-clamp-2">{n.message}</span>
                    <span className="mt-1 block text-[11px] text-[var(--color-ink-soft)]/70">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-beacon)]" />}
                </button>
              );
            })}
          </div>
          <div className="border-t border-[var(--color-border-soft)] p-2">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/org/notifications");
              }}
              className="w-full rounded-lg py-2 text-center text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-surface-sunken)]"
            >
              عرض جميع الإشعارات
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
