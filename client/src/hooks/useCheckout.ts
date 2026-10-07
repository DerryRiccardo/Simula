'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { PATHS } from '@/constants/paths';
import { handleApiError } from '@/lib/apiError';
import { checkoutService } from '@/services/checkout';
import { learningKeys } from './useLearning';

export function useCheckout(slug: string) {
  return useQuery({
    queryKey: learningKeys.checkout(slug),
    queryFn: () => checkoutService.get(slug),
  });
}

// Semua aksi checkout mengubah Case Saya dan dashboard, jadi seluruh data belajar di-refresh.
function useInvalidateLearning() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: learningKeys.all });
}

export function useCreateOrder() {
  const invalidate = useInvalidateLearning();
  return useMutation({
    mutationFn: checkoutService.createOrder,
    onSuccess: async (order) => {
      await invalidate();
      if (order.vaNumber) {
        toast.success('Invoice dibuat', {
          description: 'Selesaikan transfer sebelum batas waktu.',
        });
      }
    },
    onError: (error) => handleApiError(error, 'Gagal membuat pesanan. Coba lagi.'),
  });
}

export function useCancelOrder() {
  const invalidate = useInvalidateLearning();
  return useMutation({
    mutationFn: checkoutService.cancelOrder,
    onSuccess: async () => {
      await invalidate();
      toast.success('Pesanan dibatalkan', { description: 'Pilih metode pembayaran lain.' });
    },
    onError: (error) => handleApiError(error, 'Gagal membatalkan pesanan.'),
  });
}

/** Prototype: hasil pembayaran dari payment gateway tiruan. Berhasil → ke halaman pengerjaan. */
export function useSimulatePayment(slug: string) {
  const invalidate = useInvalidateLearning();
  const router = useRouter();
  return useMutation({
    mutationFn: checkoutService.simulatePayment,
    onSuccess: async (order, { outcome }) => {
      await invalidate();
      if (order.status === 'paid') {
        toast.success('Pembayaran berhasil', {
          description: 'Case masuk ke Case Saya dengan status Belum dimulai.',
        });
        router.push(PATHS.caseWork(slug));
        return;
      }
      toast.error(outcome === 'expired' ? 'Batas waktu bayar habis' : 'Pembayaran gagal', {
        description: 'Kamu bisa membayar ulang kapan saja.',
      });
    },
    onError: (error) => handleApiError(error, 'Status pembayaran gagal diperbarui.'),
  });
}
