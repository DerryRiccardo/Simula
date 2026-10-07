import type { ReactNode } from 'react';

interface SettingsSectionProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}

// Pola halaman pengaturan: judul dan penjelasan di kiri, isian di kanan; dipisah garis tipis.
export function SettingsSection({ id, title, description, children }: SettingsSectionProps) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="grid grid-cols-1 gap-5 border-t border-line pt-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10"
    >
      <div>
        <h2 id={`${id}-title`} className="text-[0.9375rem] md:text-[0.9375rem]">
          {title}
        </h2>
        <p className="mt-1 max-w-[40ch] text-sm leading-relaxed text-pretty text-ink-muted">
          {description}
        </p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
