import { Landmark, QrCode, Wallet, type LucideIcon } from 'lucide-react';

import type { TPaymentMethod } from '@/types';

export interface IPaymentMethodOption {
  value: TPaymentMethod;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Rupiah. PLACEHOLDER: biaya admin ilustrasi, ikuti tarif payment gateway yang dipakai. */
  adminFee: number;
  isVirtualAccount: boolean;
}

export interface IPaymentMethodGroup {
  id: string;
  label: string;
  options: IPaymentMethodOption[];
}

export const PAYMENT_METHOD_GROUPS: IPaymentMethodGroup[] = [
  {
    id: 'va',
    label: 'Transfer virtual account',
    options: [
      {
        value: 'va_bca',
        label: 'BCA Virtual Account',
        hint: 'Dicek otomatis',
        icon: Landmark,
        adminFee: 4000,
        isVirtualAccount: true,
      },
      {
        value: 'va_mandiri',
        label: 'Mandiri Virtual Account',
        hint: 'Dicek otomatis',
        icon: Landmark,
        adminFee: 4000,
        isVirtualAccount: true,
      },
      {
        value: 'va_bni',
        label: 'BNI Virtual Account',
        hint: 'Dicek otomatis',
        icon: Landmark,
        adminFee: 4000,
        isVirtualAccount: true,
      },
    ],
  },
  {
    id: 'instant',
    label: 'E-wallet dan QRIS',
    options: [
      {
        value: 'qris',
        label: 'QRIS',
        hint: 'Semua aplikasi bank dan e-wallet',
        icon: QrCode,
        adminFee: 0,
        isVirtualAccount: false,
      },
      {
        value: 'gopay',
        label: 'GoPay',
        hint: 'Langsung dari aplikasi Gojek',
        icon: Wallet,
        adminFee: 0,
        isVirtualAccount: false,
      },
    ],
  },
];

export const PAYMENT_METHODS = PAYMENT_METHOD_GROUPS.flatMap((group) => group.options);

export const PAYMENT_METHOD_BY_VALUE = Object.fromEntries(
  PAYMENT_METHODS.map((option) => [option.value, option])
) as Record<TPaymentMethod, IPaymentMethodOption>;

/** Batas waktu bayar setelah order dibuat. */
export const PAYMENT_WINDOW_HOURS = 24;

// Wajib tampil di halaman detail B2B dan checkout sebelum tombol bayar (CONTEXT.md 4.6).
export const B2B_PURCHASE_DISCLAIMER =
  'Pembelian case tidak menjamin panggilan interview. Kandidat dengan skor tinggi dari reviewer berkesempatan masuk daftar prioritas perusahaan mitra.';
