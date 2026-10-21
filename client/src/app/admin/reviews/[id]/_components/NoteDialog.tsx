'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { TextareaField } from '@/components/forms';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui';

const MIN_NOTE_LENGTH = 10;

const schema = z.object({
  note: z.string().trim().min(MIN_NOTE_LENGTH, `Tulis minimal ${MIN_NOTE_LENGTH} karakter.`),
});
type TNoteValues = z.infer<typeof schema>;

interface NoteDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
  label: string;
  placeholder: string;
  hint: string;
  confirmLabel: string;
  isPending: boolean;
  onSubmit: (note: string) => void;
}

// Dialog konfirmasi yang meminta alasan tertulis: tandai bermasalah dan cabut sertifikat.
export function NoteDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  hint,
  confirmLabel,
  isPending,
  onSubmit,
}: NoteDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TNoteValues>({ resolver: zodResolver(schema), defaultValues: { note: '' } });

  // Isian lama tidak terbawa saat dialog dibuka lagi.
  useEffect(() => {
    if (isOpen) reset({ note: '' });
  }, [isOpen, reset]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isPending && onOpenChange(open)}>
      <DialogContent>
        <form
          onSubmit={handleSubmit(({ note }) => onSubmit(note))}
          className="grid gap-4"
          noValidate
        >
          <div className="grid gap-2">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
          <TextareaField
            id="admin-note"
            label={label}
            placeholder={placeholder}
            hint={hint}
            rows={4}
            error={errors.note?.message}
            {...register('note')}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="pill" disabled={isPending}>
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" size="pill" disabled={isPending} className="active:scale-[0.98]">
              {isPending && <Loader2 className="animate-spin" />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
