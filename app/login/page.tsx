"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, Lightbulb } from "lucide-react";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { signInAction } from "@/lib/server/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setStatus("error");
      setError("الرجاء إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }
    setStatus("loading");
    const result = await signInAction({ email, password });
    if (!result.ok) {
      setStatus("error");
      setError(result.message);
      return;
    }
    setStatus("success");
    setTimeout(() => {
      router.push("/org/dashboard");
      router.refresh();
    }, 700);
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-[var(--color-primary)] p-10 text-white lg:flex">
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: "radial-gradient(circle at 30% 20%, white 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }} />
        <div className="relative flex items-center gap-3">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M20 3 L31 12 V33 H9 V12 Z" fill="var(--color-primary-light)" />
            <path d="M20 3 L31 12 H9 Z" fill="var(--color-beacon)" />
            <rect x="16" y="18" width="8" height="15" fill="var(--color-primary-dark)" />
            <circle cx="20" cy="10" r="2.4" fill="#fff" className="beacon-pulse" />
          </svg>
          <span className="font-display text-2xl font-bold">منارة</span>
        </div>
        <div className="relative">
          <h2 className="font-display text-3xl font-bold leading-tight">
            منصة موحدة لإدارة وحوكمة
            <br />
            دورة حياة الابتكار المؤسسي
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
            من استقبال الأفكار وتقييمها، إلى اتخاذ القرار وتحويلها إلى مشاريع قابلة للتنفيذ — كل ذلك موثّق
            ومتاح للجهة ضمن بيئة واحدة.
          </p>
        </div>
        <p className="relative text-xs text-white/40">وزارة الموارد البشرية والتنمية الاجتماعية · بوابة مسؤول الجهة</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-[var(--color-canvas)] px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
              <Lightbulb size={16} />
            </span>
            <span className="font-display text-xl font-bold text-[var(--color-ink)]">منارة</span>
          </div>

          {status === "success" ? (
            <div className="flex flex-col items-center rounded-2xl border border-[var(--color-success)]/20 bg-[var(--color-success-soft)] px-6 py-10 text-center">
              <CheckCircle2 size={36} className="text-[var(--color-success)]" />
              <p className="mt-3 font-display text-lg font-bold text-[var(--color-ink)]">تم تسجيل الدخول بنجاح</p>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">جارٍ تحويلك إلى لوحة التحكم...</p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-[var(--color-ink)]">تسجيل الدخول</h1>
              <p className="mt-1.5 text-sm text-[var(--color-ink-soft)]">
                أدخل بيانات حسابك في منصة منارة للوصول إلى بوابة مسؤول الجهة.
              </p>

              <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4">
                {status === "error" && (
                  <div className="rounded-lg border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-sm text-[var(--color-danger)]">
                    {error}
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-[var(--color-ink)]">
                    البريد الإلكتروني الوظيفي
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@organization.gov.sa"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-[var(--color-ink)]">
                      كلمة المرور
                    </label>
                    <Link href="/forgot-password" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                      نسيت كلمة المرور؟
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-ink-soft)]"
                      aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <Button type="submit" size="lg" loading={status === "loading"} className="mt-1 w-full">
                  {status === "loading" ? "جارٍ التحقق..." : "تسجيل الدخول"}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-[var(--color-ink-soft)]">
                أدخل بيانات حسابك الحقيقية للوصول إلى منصة منارة.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
