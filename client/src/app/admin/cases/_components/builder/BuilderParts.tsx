import type { ChangeEvent, ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui';

interface BuilderSectionProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}

// Satu bagian pembuat case; id dipakai navigasi bagian di samping form.
export function BuilderSection({ id, title, description, children }: BuilderSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 rounded-card border border-line bg-white p-5 sm:p-6"
    >
      <h2 id={`${id}-title`} className="text-[1.0625rem] md:text-[1.0625rem]">
        {title}
      </h2>
      <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-ink-muted">{description}</p>
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}

interface ItemCardProps {
  label: string;
  onRemove?: () => void;
  children: ReactNode;
}

/** Satu baris daftar (tugas, materi, slot, kriteria) dengan tombol hapus. */
export function ItemCard({ label, onRemove, children }: ItemCardProps) {
  return (
    <div className="grid gap-4 rounded-control border border-line bg-surface-soft/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs font-medium text-ink-subtle tabular-nums">{label}</p>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-ink-subtle hover:text-destructive"
            aria-label={`Hapus ${label.toLowerCase()}`}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

export function AddItemButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="pill" className="w-fit" onClick={onClick}>
      <Plus className="size-4" />
      {label}
    </Button>
  );
}

/** Input angka untuk react-hook-form: kosong dianggap 0 agar skema tetap bertipe number. */
export const toNumberInput = (field: {
  value: number;
  onChange: (value: number) => void;
  onBlur: () => void;
  name: string;
}) => ({
  name: field.name,
  type: 'number' as const,
  inputMode: 'numeric' as const,
  value: Number.isFinite(field.value) ? field.value : '',
  onBlur: field.onBlur,
  onChange: (event: ChangeEvent<HTMLInputElement>) =>
    field.onChange(event.target.value === '' ? 0 : event.target.valueAsNumber),
});
