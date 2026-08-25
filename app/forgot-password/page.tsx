"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MailCheck, KeyRound, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

type Step = "request" | "sent" | "reset" | "done";

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
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-primary)]">
          <ArrowRight size={15} />
          العودة لتسجيل الدخول
        </Link>

        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-white p-7 shadow-[var(--shadow-card)]">
          {step === "request" && (
            <>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <KeyRound size={19} />
              </div>
              <h1 className="font-display text-xl font-bold text-[var(--color-ink)]">استعادة كلمة المرور</h1>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                أدخل بريدك الإلكتروني الوظيفي وسنرسل لك رمزًا لاستعادة الوصول إلى حسابك.
              </p>
              <form onSubmit={requestReset} className="mt-5 flex flex-col gap-3">
                {error && <p className="text-xs font-medium text-[var(--color-danger)]">{error}</p>}
                <Input type="email" placeholder="name@organization.gov.sa" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Button type="submit" loading={loading} className="w-full">
                  إرسال رمز الاستعادة
                </Button>
              </form>
            </>
          )}

          {step === "sent" && (
            <>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-info-soft)] text-[var(--color-info)]">
                <MailCheck size={19} />
              </div>
              <h1 className="font-display text-xl font-bold text-[var(--color-ink)]">تحقق من بريدك الإلكتروني</h1>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                أرسلنا رمزًا مكونًا من 6 أرقام إلى <span className="font-medium text-[var(--color-ink)]">{email}</span>.
              </p>
              <form onSubmit={verifyCode} className="mt-5 flex flex-col gap-3">
                {error && <p className="text-xs font-medium text-[var(--color-danger)]">{error}</p>}
                <Input placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} className="text-center tracking-[0.5em]" />
                <Button type="submit" className="w-full">تحقق من الرمز</Button>
              </form>
            </>
          )}

          {step === "reset" && (
            <>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <KeyRound size={19} />
              </div>
              <h1 className="font-display text-xl font-bold text-[var(--color-ink)]">تعيين كلمة مرور جديدة</h1>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">اختر كلمة مرور قوية لا تقل عن 8 أحرف.</p>
              <form onSubmit={resetPassword} className="mt-5 flex flex-col gap-3">
                {error && <p className="text-xs font-medium text-[var(--color-danger)]">{error}</p>}
                <Input type="password" placeholder="كلمة المرور الجديدة" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Input type="password" placeholder="تأكيد كلمة المرور" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                <Button type="submit" loading={loading} className="w-full">حفظ كلمة المرور</Button>
              </form>
            </>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center py-4 text-center">
              <CheckCircle2 size={36} className="text-[var(--color-success)]" />
              <h1 className="mt-3 font-display text-lg font-bold text-[var(--color-ink)]">تم تحديث كلمة المرور</h1>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.</p>
              <Button className="mt-5 w-full" onClick={() => router.push("/login")}>
                الذهاب لتسجيل الدخول
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
