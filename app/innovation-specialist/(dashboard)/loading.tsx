export default function SpecialistLoading() {
  return <div className="mx-auto max-w-[1500px] animate-pulse" role="status" aria-label="جارٍ تحميل الصفحة">
    <div className="h-7 w-52 rounded bg-ispec-border-soft" />
    <div className="mt-3 h-4 w-full max-w-xl rounded bg-ispec-surface-sunken" />
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 rounded-xl border border-ispec-border-soft bg-ispec-surface" />)}
    </div>
    <div className="mt-6 h-80 rounded-xl border border-ispec-border-soft bg-ispec-surface" />
    <span className="sr-only">جارٍ التحميل...</span>
  </div>;
}
