/** Formats an ISO date string using the Arabic (Hijri, ar-SA default) calendar consistent with the rest of the app. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso));
}
