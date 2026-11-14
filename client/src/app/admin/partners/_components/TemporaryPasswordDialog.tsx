'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui';
import type { IAdminReviewer } from '@/types';

interface TemporaryPasswordDialogProps {
  /** null = tertutup. */
  reviewer: IAdminReviewer | null;
  onClose: () => void;
}

// Kata sandi sementara reviewer baru hanya dikirim sekali oleh server; setelah dialog ditutup tidak
// bisa dilihat lagi. Reviewer wajib menggantinya saat pertama masuk.
export function TemporaryPasswordDialog({ reviewer, onClose }: TemporaryPasswordDialogProps) {
  const password = reviewer?.temporaryPassword ?? '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Kata sandi disalin');
    } catch {
      toast.error('Gagal menyalin. Salin kata sandinya secara manual.');
    }
  };

  return (
    <Dialog open={!!reviewer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <div className="grid gap-2">
          <DialogTitle>Reviewer ditambahkan</DialogTitle>
          <DialogDescription>
            Berikan email dan kata sandi sementara ini ke {reviewer?.name}. Kata sandi hanya tampil
            sekali, dan wajib diganti saat pertama masuk.
          </DialogDescription>
        </div>

        <dl className="grid gap-3 rounded-control border border-line p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Email</dt>
            <dd className="break-all text-ink">{reviewer?.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-muted">Kata sandi sementara</dt>
            <dd className="flex items-center gap-2">
              <span className="font-mono text-ink">{password}</span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Salin kata sandi sementara"
                className="grid size-7 place-items-center rounded-tag border border-line text-ink-muted transition-colors outline-none hover:border-ink/25 hover:text-ink focus-visible:ring-3 focus-visible:ring-brand/30"
              >
                <Copy className="size-3.5" />
              </button>
            </dd>
          </div>
        </dl>

        <DialogFooter>
          <Button size="pill" onClick={onClose}>
            Selesai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
