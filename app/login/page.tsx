"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { signInAction } from "@/lib/server/actions/auth";
import { resolveMyHomeRouteAction } from "@/lib/server/actions/routing";

// Same visual identity as the public landing page (app/page.tsx): the dark
// #0B0F1A palette, Cairo/IBM Plex Sans Arabic fonts, and accent colors
// (#F0C25B gold CTA, #7FB2F0 blue). This page intentionally does NOT use
// the shared components/ui/{button,form}.tsx or the --color-* tokens —
// those are the light theme shared by the org-admin/specialist/innovator
// interfaces, and changing them would change colors everywhere. Login is
// still public-facing surface (like the landing page), so it gets the same
// standalone look, not the internal-interface theme.
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
    const routeResult = await resolveMyHomeRouteAction();
    const target =
      routeResult.ok && routeResult.data.kind === "REDIRECT" ? routeResult.data.path : "/";
    setTimeout(() => {
      router.push(target);
      router.refresh();
    }, 700);
  };

  const inputClass =
    "h-11 w-full rounded-lg border border-[#2B3352] bg-[#0D1220] px-3.5 text-sm text-[#EDEFF7] placeholder:text-[#6B7594] transition-colors focus:outline-none focus:border-[#7FB2F0] focus:ring-2 focus:ring-[#7FB2F0]/25";

  return (
    <div
      dir="rtl"
      className="flex min-h-screen bg-[#0B0F1A] text-[#EDEFF7]"
      style={{ fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif" }}
    >
      {/* Brand panel */}
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden border-l border-[#1B2138] bg-[#0D1220] p-10 lg:flex">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle at 30% 20%, white 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: "#32e884" }} />
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif" }}
          >
            منارة
          </span>
        </div>
        <div className="relative">
          <h2
            className="text-3xl font-bold leading-[1.3]"
            style={{ fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif" }}
          >
            منصة موحدة لإدارة وحوكمة
            <br />
            دورة حياة الابتكار المؤسسي
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[#9AA3C0]">
            من استقبال الأفكار وتقييمها، إلى اتخاذ القرار وتحويلها إلى مشاريع قابلة للتنفيذ — كل ذلك موثّق
            ومتاح للجهة ضمن بيئة واحدة.
          </p>
        </div>
        <p className="relative text-xs text-[#6B7594]">منارة · منصة الابتكار المؤسسي</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: "#32e884" }} />
            <span
              className="text-xl font-bold"
              style={{ fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif" }}
            >
              منارة
            </span>
          </div>

          {status === "success" ? (
            <div className="flex flex-col items-center rounded-2xl border border-[#4ADE9C]/25 bg-[#0D1220] px-6 py-10 text-center">
              <CheckCircle2 size={36} style={{ color: "#4ADE9C" }} />
              <p className="mt-3 text-lg font-bold" style={{ fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif" }}>
                تم تسجيل الدخول بنجاح
              </p>
              <p className="mt-1 text-sm text-[#9AA3C0]">جارٍ تحويلك إلى لوحة التحكم...</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif" }}>
                تسجيل الدخول
              </h1>
              <p className="mt-1.5 text-sm text-[#9AA3C0]">أدخل بيانات حسابك في منصة منارة.</p>

              <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4">
                {status === "error" && (
                  <div className="rounded-lg border border-red-400/25 bg-red-950/40 px-3.5 py-2.5 text-sm text-red-300">
                    {error}
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-[#EDEFF7]">
                    البريد الإلكتروني الوظيفي
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@organization.gov.sa"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-[#EDEFF7]">
                      كلمة المرور
                    </label>
                    <Link href="/forgot-password" className="text-xs font-medium text-[#7FB2F0] hover:underline">
                      نسيت كلمة المرور؟
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className={`${inputClass} pl-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute top-1/2 left-3 -translate-y-1/2 text-[#9AA3C0] hover:text-[#EDEFF7]"
                      aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="mt-1 flex h-12 w-full items-center justify-center rounded-lg text-sm font-bold text-[#0B0F1A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: "#F0C25B" }}
                >
                  {status === "loading" ? "جارٍ التحقق..." : "تسجيل الدخول"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-[#6B7594]">أدخل بيانات حسابك الحقيقية للوصول إلى منصة منارة.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
