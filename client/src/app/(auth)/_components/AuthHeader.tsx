import type { ReactNode } from 'react';

interface AuthHeaderProps {
  title: string;
  description: ReactNode;
}

export function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <div>
      <h1 className="text-page-title">{title}</h1>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-pretty text-ink-muted">
        {description}
      </p>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-ink-subtle" role="separator">
      <span className="h-px flex-1 bg-line" />
      atau dengan email
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
