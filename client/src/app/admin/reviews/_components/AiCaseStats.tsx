import type { IAdminCaseGradingStat } from '@/types';

const passRate = (stat: IAdminCaseGradingStat) =>
  stat.gradedCount > 0 ? `${Math.round((stat.passedCount / stat.gradedCount) * 100)}%` : '-';

// Ringkasan per AI case (CONTEXT.md 4.13): bahan mengecek case atau rubrik yang terlalu sulit/mudah.
export function AiCaseStats({ stats }: { stats: IAdminCaseGradingStat[] }) {
  if (stats.length === 0) return null;
  return (
    <section aria-labelledby="ai-case-stats" className="grid gap-4">
      <div>
        <h2 id="ai-case-stats" className="text-lg tracking-[-0.01em] md:text-lg">
          Ringkasan per case
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          Tingkat lulus yang sangat rendah atau sangat tinggi bisa berarti rubrik perlu disesuaikan.
        </p>
      </div>
      <div className="overflow-x-auto rounded-card border border-line bg-white">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="border-b border-line bg-surface-soft/60 text-left text-xs text-ink-subtle">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-medium">
                Case
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Dinilai
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Lulus
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Rata-rata
              </th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">
                Ditandai
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {stats.map((stat) => (
              <tr key={stat.caseId}>
                <th
                  scope="row"
                  className="max-w-[18rem] truncate px-5 py-3 text-left font-medium text-ink"
                >
                  {stat.caseTitle}
                </th>
                <td className="px-3 py-3 text-right font-mono text-[0.8125rem] tabular-nums">
                  {stat.gradedCount}
                </td>
                <td className="px-3 py-3 text-right font-mono text-[0.8125rem] tabular-nums">
                  {passRate(stat)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-[0.8125rem] tabular-nums">
                  {stat.averageScore ?? '-'}
                </td>
                <td
                  className={
                    stat.flaggedCount > 0
                      ? 'px-5 py-3 text-right font-mono text-[0.8125rem] font-semibold text-brand tabular-nums'
                      : 'px-5 py-3 text-right font-mono text-[0.8125rem] text-ink-subtle tabular-nums'
                  }
                >
                  {stat.flaggedCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
