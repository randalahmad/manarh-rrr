"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";
import { Button, Card, FormField } from "@/components/innovation-specialist";
import { signInAction } from "@/lib/server/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
    router.push("/innovation-specialist/dashboard");
    router.refresh();
  };

  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-50 px-4 py-10 sm:px-6" dir="rtl">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-ispec-brand-700" />

    <div className="relative w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-ispec-brand-100 bg-white shadow-ispec-card">
          <span className="text-2xl font-black text-ispec-brand-800">م</span>
        </div>
        <p className="mt-4 text-2xl font-black tracking-wide text-ispec-brand-800">مـنـارة</p>
        <p className="mt-1 text-xs font-medium text-slate-500">MANARAH</p>
      </div>

      <Card className="p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">تسجيل الدخول</h1>
          <p className="mt-2 text-sm text-slate-500">منصة إدارة الابتكار</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          {status === "error" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}
          <FormField label="البريد الإلكتروني">
            <span className="relative block">
              <Mail className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input type="email" inputMode="email" autoComplete="email" placeholder="name@organization.sa" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-lg border border-slate-300 bg-white pr-11 pl-3 text-left text-sm placeholder:text-slate-400" dir="ltr" />
            </span>
          </FormField>

          <FormField label="كلمة المرور">
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 w-full rounded-lg border border-slate-300 bg-white pr-11 pl-3 text-left text-sm placeholder:text-slate-400" dir="ltr" />
            </span>
          </FormField>

          <Button type="submit" disabled={status === "loading"} className="w-full">{status === "loading" ? "جارٍ التحقق..." : "تسجيل الدخول"}</Button>
        </form>
      </Card>
    </div>
  </main>;
}
