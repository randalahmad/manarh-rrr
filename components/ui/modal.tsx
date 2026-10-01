"use client";

import React, { useEffect } from "react";
import { X, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--color-ink)]/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-[var(--color-surface)] shadow-[var(--shadow-popover)] animate-[modal-in_0.18s_ease]",
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-lg",
          size === "lg" && "max-w-2xl"
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-soft)] px-6 py-4">
          <div>
            <h2 id="modal-title" className="font-display text-lg font-bold text-[var(--color-ink)]">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-lg p-1.5 text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-sunken)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border-soft)] px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  tone = "danger",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--color-ink)]/40" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[var(--color-surface)] p-6 shadow-[var(--shadow-popover)] animate-[modal-in_0.18s_ease]">
        <div
          className={cn(
            "mb-4 flex h-11 w-11 items-center justify-center rounded-full",
            tone === "danger" ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]" : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
          )}
        >
          <TriangleAlert size={20} />
        </div>
        <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-[var(--color-ink-soft)]">{description}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
