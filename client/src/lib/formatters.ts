import {
  differenceInBusinessDays,
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// "Andika Pratama" → "AP". Dipakai untuk avatar inisial saat foto belum tersedia.
export const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const getFirstName = (name: string) => name.split(' ')[0] ?? name;

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export const formatPrice = (price: number | null) =>
  price === null ? 'Gratis' : rupiahFormatter.format(price);

export const formatNumber = (value: number) => new Intl.NumberFormat('id-ID').format(value);

export const formatDate = (iso: string) =>
  format(new Date(iso), 'd MMMM yyyy', { locale: localeId });

/** "Senin, 5 Oktober 2026". */
export const formatLongDate = (date: Date) =>
  format(date, 'EEEE, d MMMM yyyy', { locale: localeId });

export const formatRelative = (iso: string) =>
  formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: localeId });

/** "Sisa 3 hari", "Berakhir hari ini", atau "Lewat 2 hari". */
export function formatDeadline(iso: string) {
  const days = differenceInCalendarDays(new Date(iso), new Date());
  if (days > 0) return `Sisa ${days} hari`;
  if (days === 0) return 'Berakhir hari ini';
  return `Lewat ${Math.abs(days)} hari`;
}

/** Sisa hari kerja menuju perkiraan selesai, mis. batas SLA review. */
export function formatBusinessDaysLeft(iso: string) {
  const due = new Date(iso);
  if (differenceInCalendarDays(due, new Date()) < 0) return 'Melewati perkiraan';
  const days = differenceInBusinessDays(due, new Date());
  if (days <= 0) return 'Hari ini';
  return `${days} hari kerja lagi`;
}

/** "860 KB", "1,3 MB". */
export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`;
}

/** "14.32" (format jam Indonesia). */
export const formatTime = (iso: string) => format(new Date(iso), 'HH.mm', { locale: localeId });

/** "23 jam 41 menit" atau "12 menit" menuju batas waktu; "0 menit" bila sudah lewat. */
export function formatTimeLeft(iso: string) {
  const minutes = Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} jam ${minutes % 60} menit` : `${minutes} menit`;
}

/** "5 Oktober 2026, 14.32". */
export const formatDateTime = (iso: string) =>
  format(new Date(iso), 'd MMMM yyyy, HH.mm', { locale: localeId });
