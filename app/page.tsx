import Link from "next/link";

// This is the single non-conflicting entry point for the merged platform
// (see manarah-merge-plan.md, section 4.4). Each of the three interfaces
// previously owned "/" (or "/login") in its own standalone repository —
// their mock logins now live at namespaced routes below and keep their own
// visual identity unchanged. Unifying this into one designed login/landing
// screen is deliberately out of scope for this merge stage (visual identity
// unification is a later phase).
const ENTRIES = [
  {
    href: "/login",
    title: "مسؤول الجهة",
    subtitle: "Organization Admin",
    description: "إدارة وحوكمة دورة حياة الابتكار المؤسسي.",
  },
  {
    href: "/innovator/login",
    title: "المبتكر",
    subtitle: "Innovator",
    description: "تقديم الأفكار ومتابعة المشاريع.",
  },
  {
    href: "/innovation-specialist/login",
    title: "مسؤول الابتكار",
    subtitle: "Innovation Specialist",
    description: "مراجعة الأفكار المسندة ومتابعة المشاريع المعتمدة.",
  },
];

export default function RootPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-[var(--color-canvas)] px-4 py-16">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-[var(--color-ink)]">منارة</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">اختر الواجهة التي تريد الدخول إليها</p>
      </div>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {ENTRIES.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-right shadow-[var(--shadow-card)] transition-colors hover:border-[var(--color-primary)]"
          >
            <span className="font-display text-lg font-bold text-[var(--color-ink)]">{entry.title}</span>
            <span className="text-xs font-medium text-[var(--color-ink-soft)]">{entry.subtitle}</span>
            <span className="mt-1 text-sm leading-relaxed text-[var(--color-ink-soft)]">{entry.description}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
