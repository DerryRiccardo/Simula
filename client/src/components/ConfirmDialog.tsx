'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui';

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  isPending?: boolean;
  /** Konten tambahan di antara deskripsi dan tombol, misalnya ringkasan isian. */
  children?: ReactNode;
}

// Konfirmasi untuk aksi final (CLAUDE.md 9.2): mulai tenggat, submit, dan sejenisnya.
export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isPending = false,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isPending && onOpenChange(open)}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription asChild>
          <div>{description}</div>
        </DialogDescription>
        {children}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="pill" disabled={isPending}>
              Batal
            </Button>
          </DialogClose>
          <Button
            size="pill"
            onClick={onConfirm}
            disabled={isPending}
            className="active:scale-[0.98]"
          >
            {isPending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
