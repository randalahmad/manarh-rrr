export interface SkipToContentLinkProps {
  targetId: string;
}

/** Visually hidden until keyboard-focused, then appears in the corner — lets keyboard users bypass the sidebar/header on every page instead of tabbing through it each time. */
export function SkipToContentLink({ targetId }: SkipToContentLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-[100] focus:rounded-inv-control focus:bg-inv-brand-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-2 focus:outline-offset-2 focus:outline-inv-beacon-500"
    >
      تخطي إلى المحتوى
    </a>
  );
}
