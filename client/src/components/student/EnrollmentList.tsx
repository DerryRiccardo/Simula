import { Reveal } from '@/components/animated';
import { cn } from '@/lib/utils';
import type { IEnrollment } from '@/types';
import { ENROLLMENT_GRID, EnrollmentRow } from './EnrollmentRow';

interface EnrollmentListProps {
  items: IEnrollment[];
  /** true = baris pertama memakai tombol biru (daftar diurutkan dari yang paling mendesak). */
  isFirstPrimary?: boolean;
  /** false = baris ringkas tanpa kolom tabel, untuk area sempit seperti dashboard. */
  isTable?: boolean;
}

// Satu panel bersekat garis, bukan tumpukan kartu terpisah. Dipakai di Dashboard dan Case Saya.
export function EnrollmentList({
  items,
  isFirstPrimary = false,
  isTable = true,
}: EnrollmentListProps) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      {isTable && (
        <div
          className={cn(
            'hidden border-b border-line bg-surface-soft/60 px-5 py-2.5 text-xs font-medium text-ink-subtle xl:grid',
            ENROLLMENT_GRID
          )}
          aria-hidden="true"
        >
          <span>Case</span>
          <span>Status</span>
          <span>Tenggat / skor</span>
          <span className="text-right">Aksi</span>
        </div>
      )}
      <ol className="divide-y divide-line">
        {items.map((enrollment, index) => (
          <Reveal key={enrollment.id} as="li" offset={8} delay={Math.min(index * 0.04, 0.24)}>
            <EnrollmentRow
              enrollment={enrollment}
              isPrimary={isFirstPrimary && index === 0}
              isCompact={!isTable}
            />
          </Reveal>
        ))}
      </ol>
    </div>
  );
}
