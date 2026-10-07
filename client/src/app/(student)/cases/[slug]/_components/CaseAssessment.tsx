import { Sparkles, UserCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ICaseDetail } from '@/types';

// Tingkat kepekatan per kriteria, agar satu bar bersegmen tetap terbaca tanpa warna tambahan.
const SEGMENT_OPACITY = ['opacity-100', 'opacity-70', 'opacity-45', 'opacity-25'];

export function CaseAssessment({ detail }: { detail: ICaseDetail }) {
  const isAi = detail.tier === 'ai';
  const tone = isAi ? 'bg-ai' : 'bg-brand';
  const Icon = isAi ? Sparkles : UserCheck;

  return (
    <div className="grid gap-6">
      <div className="flex items-start gap-3">
        <Icon
          className={cn('mt-0.5 size-5 shrink-0', isAi ? 'text-ai' : 'text-brand')}
          strokeWidth={1.75}
        />
        <div>
          <p className="text-sm font-medium text-ink">
            {isAi
              ? 'Dinilai otomatis oleh AI'
              : `Direview oleh ${detail.reviewerRole} dari ${detail.partner?.name}`}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
            {isAi
              ? 'Skor dan feedback per kriteria keluar dalam hitungan menit. Satu kali submit per percobaan.'
              : 'Reviewer menilai sesuai rubrik dan dapat meminta revisi sebelum memberi nilai akhir.'}
          </p>
        </div>
      </div>

      <div>
        {/* Satu bar 100% dibagi sesuai bobot: proporsi antarkriteria terlihat sekilas. */}
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
          {detail.criteria.map((criterion, index) => (
            <span
              key={criterion.name}
              className={cn(tone, SEGMENT_OPACITY[index % SEGMENT_OPACITY.length])}
              style={{ width: `${criterion.weight}%` }}
            />
          ))}
        </div>
        <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
          {detail.criteria.map((criterion, index) => (
            <li key={criterion.name} className="flex items-center gap-2.5 text-sm">
              <span
                className={cn(
                  'size-2 shrink-0 rounded-[2px]',
                  tone,
                  SEGMENT_OPACITY[index % SEGMENT_OPACITY.length]
                )}
                aria-hidden="true"
              />
              <span className="flex-1 text-ink-muted">{criterion.name}</span>
              <span className="font-mono text-ink tabular-nums">{criterion.weight}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
