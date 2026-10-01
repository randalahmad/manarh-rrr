import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/server/auth/session";
import { resolveHomeRoute } from "@/lib/server/routing/home-route";
import { signOutAction } from "@/lib/server/actions/auth";

// Root entry point for منارة (Manarah).
// An anonymous visitor sees the static marketing page below. A signed-in
// visitor is redirected straight to their role's home route (see
// lib/server/routing/home-route.ts) — there is no "choose your interface"
// picker anymore; the interface is decided by the session, not a click.
//
// force-dynamic: this page reads the session on every request, so it must
// never be statically prerendered at build time (same reasoning as
// app/super-admin/layout.tsx and the other session-checking layouts).
export const dynamic = "force-dynamic";

// Thin wrapper so the existing signOutAction() (which returns an
// ActionResult) can be used directly as a <form action={...}>, which
// requires a void-returning server action. Does not change signOutAction
// itself.
async function handleSignOut() {
  "use server";
  await signOutAction();
}

// This page intentionally uses its OWN color palette (defined inline below)
// instead of the shared --color-* tokens in app/globals.css. Those shared
// tokens are used across the org-admin, innovator, and innovation-specialist
// interfaces — changing them here would change colors everywhere. The
// landing page is public marketing surface, so it gets its own look.

const JOURNEY = [
  { code: "01", label: "اكتشاف", note: "طرح الأفكار", color: "#7FB2F0" },
  { code: "02", label: "تقييم", note: "مراجعة ومعايير", color: "#B79BF5" },
  { code: "03", label: "تنفيذ", note: "مشاريع ومتابعة", color: "#4ADE9C" },
  { code: "04", label: "أثر", note: "قياس النتائج", color: "#F0C25B" },
];

export default async function RootPage() {
  const actor = await getCurrentActor();
  const home = resolveHomeRoute(actor);

  if (home.kind === "REDIRECT") {
    redirect(home.path);
  }

  if (home.kind === "ACCESS_DENIED") {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0B0F1A] px-6 text-center text-[#EDEFF7]"
        style={{ fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif" }}
      >
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif" }}
        >
          لا يوجد لديك صلاحية وصول
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-[#9AA3C0]">
          حسابك غير مرتبط بأي دور فعّال في المنصة. تواصل مع مسؤول النظام.
        </p>
        <form action={handleSignOut}>
          <button
            type="submit"
            className="mt-2 rounded-lg border border-[#2B3352] px-5 py-2 text-sm font-semibold text-[#EDEFF7] transition-colors hover:border-[#7FB2F0] hover:text-[#7FB2F0]"
          >
            تسجيل الخروج
          </button>
        </form>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#0B0F1A] text-[#EDEFF7]"
      style={{ fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif" }}
    >
      {/* شريط علوي */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full"
            style={{ background: "#32e884" }}
          />
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif" }}
          >
            منارة
          </span>
        </div>
        <Link
          href="/login"
          className="rounded-lg border border-[#2B3352] px-5 py-2 text-sm font-semibold text-[#EDEFF7] transition-colors hover:border-[#7FB2F0] hover:text-[#7FB2F0]"
        >
          تسجيل الدخول
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14 sm:px-10 sm:pt-20">
        <p
          className="text-xs font-medium tracking-[0.2em] text-[#7FB2F0]"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          MANARAH · PLATFORM
        </p>
        <h1
          className="mt-4 max-w-2xl text-4xl font-bold leading-[1.3] sm:text-5xl"
          style={{ fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif" }}
        >
          منارة     
          <br />
        منصة الابتكار المؤسسي
          <br />
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-[#9AA3C0]">
         من الفكرة إلى الاثر
        </p>
        <div className="mt-8">
          <Link
            href="/login"
            className="inline-block rounded-lg px-7 py-3 text-sm font-bold text-[#0B0F1A] transition-opacity hover:opacity-90"
            style={{ background: "#F0C25B" }}
          >
            تسجيل الدخول
          </Link>
        </div>
      </section>

      {/* الخط الزمني التقني */}
      <section className="border-y border-[#1B2138] bg-[#0D1220] px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-6xl">
          {/* الخط المتدرّج — يمثّل المسار من الفكرة إلى الأثر بصريًا */}
          <div
            aria-hidden="true"
            className="mb-10 hidden h-px w-full sm:block"
            style={{
              background:
                "linear-gradient(to left, #7FB2F0, #B79BF5, #4ADE9C, #F0C25B)",
            }}
          />
          <div className="grid gap-8 sm:grid-cols-4 sm:gap-6">
            {JOURNEY.map((step) => (
              <div key={step.code} className="relative pt-2">
                <span
                  aria-hidden="true"
                  className="absolute -top-[calc(2.5rem+1px)] right-0 hidden h-2 w-2 -translate-y-1/2 rounded-full sm:block"
                  style={{ background: step.color }}
                />
                <span
                  className="text-xs"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: step.color }}
                >
                  {step.code}
                </span>
                <h3
                  className="mt-2 text-lg font-bold"
                  style={{ fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif" }}
                >
                  {step.label}
                </h3>
                <p className="mt-1 text-sm text-[#9AA3C0]">{step.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* الحوكمة */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-[#1B2138] bg-[#0D1220] px-8 py-8 sm:flex-row sm:items-center">
          <p className="max-w-md text-sm leading-relaxed text-[#9AA3C0]">
           
          </p>
          <Link
            href="/login"
            className="shrink-0 rounded-lg px-7 py-3 text-sm font-bold text-[#0B0F1A] transition-opacity hover:opacity-90"
            style={{ background: "#5bf092" }}
          >
            تسجيل الدخول
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#1B2138] px-6 py-6 text-center text-xs text-[#9AA3C0] sm:px-10">
        منارة
      </footer>
    </main>
  );
}