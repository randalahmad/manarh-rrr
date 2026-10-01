"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MailCheck, KeyRound, CheckCircle2 } from "lucide-react";

// Same dark visual identity as app/page.tsx and app/login/page.tsx — see
// login/page.tsx's header comment for why this page doesn't use the shared
// components/ui/{button,form}.tsx light theme.
type Step = "request" | "sent" | "reset" | "done";

const inputClass =
  "h-11 w-full rounded-lg border border-[#2B3352] bg-[#0D1220] px-3.5 text-sm text-[#EDEFF7] placeholder:text-[#6B7594] transition-colors focus:outline-none focus:border-[#7FB2F0] focus:ring-2 focus:ring-[#7FB2F0]/25";

const buttonClass =
  "flex h-11 w-full items-center justify-center rounded-lg text-sm font-bold text-[#0B0F1A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("الرجاء إدخال بريد إلكتروني صحيح.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("sent");
    }, 900);
  };

  const verifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4) {
      setError("الرجاء إدخال الرمز المرسل إلى بريدك الإلكتروني.");
      return;
    }
    setError("");
    setStep("reset");
  };

  const resetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("يجب ألا تقل كلمة المرور عن 8 أحرف.");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("done");
    }, 900);
  };

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#0B0F1A] px-6 py-12 text-[#EDEFF7]"
      style={{ fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-sm">
        <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#9AA3C0] hover:text-[#7FB2F0]">
          <ArrowRight size={15} />
          العودة لتسجيل الدخول
        </Link>

        <div className="rounded-2xl border border-[#1B2138] bg-[#0D1220] p-7">
          {step === "request" && (
            <>
              <div
                className="mb-2 flex h-11 w-11 items-center justify-center rounded-full"
                style={{ background: "rgba(127,178,240,0.12)", color: "#7FB2F0" }}
              >
                <KeyRound size={19} />
              </div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif" }}>
                استعادة كلمة المرور
              </h1>
              <p className="mt-1 text-sm text-[#9AA3C0]">
                أدخل بريدك الإلكتروني الوظيفي وسنرسل لك رمزًا لاستعادة الوصول إلى حسابك.
              </p>
              <form onSubmit={requestReset} className="mt-5 flex flex-col gap-3">
                {error && <p className="text-xs font-medium text-red-300">{error}</p>}
                <input
                  type="email"
                  placeholder="name@organization.gov.sa"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
                <button type="submit" disabled={loading} className={buttonClass} style={{ background: "#F0C25B" }}>
                  {loading ? "جارٍ الإرسال..." : "إرسال رمز الاستعادة"}
                </button>
              </form>
            </>
          )}

          {step === "sent" && (
            <>
              <div
                className="mb-2 flex h-11 w-11 items-center justify-center rounded-full"
                style={{ background: "rgba(127,178,240,0.12)", color: "#7FB2F0" }}
              >
                <MailCheck size={19} />
              </div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif" }}>
                تحقق من بريدك الإلكتروني
              </h1>
              <p className="mt-1 text-sm text-[#9AA3C0]">
                أرسلنا رمزًا مكونًا من 6 أرقام إلى <span className="font-medium text-[#EDEFF7]">{email}</span>.
              </p>
              <form onSubmit={verifyCode} className="mt-5 flex flex-col gap-3">
                {error && <p className="text-xs font-medium text-red-300">{error}</p>}
                <input
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className={`${inputClass} text-center tracking-[0.5em]`}
                />
                <button type="submit" className={buttonClass} style={{ background: "#F0C25B" }}>
                  تحقق من الرمز
                </button>
              </form>
            </>
          )}

          {step === "reset" && (
            <>
              <div
                className="mb-2 flex h-11 w-11 items-center justify-center rounded-full"
                style={{ background: "rgba(127,178,240,0.12)", color: "#7FB2F0" }}
              >
                <KeyRound size={19} />
              </div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif" }}>
                تعيين كلمة مرور جديدة
              </h1>
              <p className="mt-1 text-sm text-[#9AA3C0]">اختر كلمة مرور قوية لا تقل عن 8 أحرف.</p>
              <form onSubmit={resetPassword} className="mt-5 flex flex-col gap-3">
                {error && <p className="text-xs font-medium text-red-300">{error}</p>}
                <input
                  type="password"
                  placeholder="كلمة المرور الجديدة"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="password"
                  placeholder="تأكيد كلمة المرور"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                />
                <button type="submit" disabled={loading} className={buttonClass} style={{ background: "#F0C25B" }}>
                  {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
                </button>
              </form>
            </>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center py-4 text-center">
              <CheckCircle2 size={36} style={{ color: "#4ADE9C" }} />
              <h1 className="mt-3 text-lg font-bold" style={{ fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif" }}>
                تم تحديث كلمة المرور
              </h1>
              <p className="mt-1 text-sm text-[#9AA3C0]">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.</p>
              <button
                onClick={() => router.push("/login")}
                className={`${buttonClass} mt-5`}
                style={{ background: "#F0C25B" }}
              >
                الذهاب لتسجيل الدخول
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
