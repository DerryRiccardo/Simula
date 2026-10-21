'use client';

import type { FormEventHandler, ReactNode } from 'react';
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

interface FormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  isPending: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
}

// Kerangka dialog berisi form di panel admin (mitra, reviewer, bidang): judul, isian, Batal dan Simpan.
export function FormDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  submitLabel,
  isPending,
  onSubmit,
  children,
}: FormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isPending && onOpenChange(open)}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-5" noValidate>
          <div className="grid gap-2">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
          <div className="grid gap-4">{children}</div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="pill" disabled={isPending}>
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" size="pill" disabled={isPending} className="active:scale-[0.98]">
              {isPending && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
