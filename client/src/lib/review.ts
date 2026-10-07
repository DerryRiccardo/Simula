import { differenceInBusinessDays, isPast } from 'date-fns';

export type TReviewUrgency = 'overdue' | 'soon' | null;

/** Lewat SLA, tersisa 1 hari kerja atau kurang, atau masih longgar (null). */
export function getReviewUrgency(reviewDueAt: string): TReviewUrgency {
  const due = new Date(reviewDueAt);
  if (isPast(due)) return 'overdue';
  return differenceInBusinessDays(due, new Date()) <= 1 ? 'soon' : null;
}
