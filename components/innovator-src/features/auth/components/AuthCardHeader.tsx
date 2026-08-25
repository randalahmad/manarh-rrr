export interface AuthCardHeaderProps {
  title: string;
  description: string;
}

export function AuthCardHeader({ title, description }: AuthCardHeaderProps) {
  return (
    <div>
      <h2 className="font-inv-display text-xl font-bold text-inv-ink-900">{title}</h2>
      <p className="mt-1.5 text-sm text-inv-ink-500">{description}</p>
    </div>
  );
}
