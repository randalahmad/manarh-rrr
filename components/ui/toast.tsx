"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "danger" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (title: string, tone?: ToastTone, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((title: string, tone: ToastTone = "success", description?: string) => {
    toastIdCounter += 1;
    const id = toastIdCounter;
    setToasts((prev) => [...prev, { id, title, description, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-5 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 sm:bottom-6 sm:left-6 sm:translate-x-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "flex items-start gap-3 rounded-xl border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-popover)] animate-[toast-in_0.25s_ease]",
              t.tone === "success" && "border-[var(--color-success)]/25",
              t.tone === "danger" && "border-[var(--color-danger)]/25",
              t.tone === "info" && "border-[var(--color-info)]/25"
            )}
          >
            <span
              className={cn(
                "mt-0.5 shrink-0",
                t.tone === "success" && "text-[var(--color-success)]",
                t.tone === "danger" && "text-[var(--color-danger)]",
                t.tone === "info" && "text-[var(--color-info)]"
              )}
            >
              {t.tone === "success" && <CheckCircle2 size={20} />}
              {t.tone === "danger" && <XCircle size={20} />}
              {t.tone === "info" && <Info size={20} />}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--color-ink)]">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-[var(--color-ink-soft)]/60 hover:text-[var(--color-ink)]"
              aria-label="إغلاق"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
