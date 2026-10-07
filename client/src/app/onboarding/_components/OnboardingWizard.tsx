'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

import { TextField } from '@/components/forms';
import { FieldPicker, StatusPicker } from '@/components/student';
import { Button } from '@/components/ui';
import { useCompleteOnboarding, useCurrentUser } from '@/hooks/useAuth';
import { getApiFieldErrors } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { onboardingSchema, type OnboardingFormValues } from '../_schema';

const STEPS = [
  {
    title: 'Bidang apa yang ingin kamu tekuni?',
    description: 'Kami pakai pilihanmu untuk merekomendasikan case study yang paling relevan.',
  },
  {
    title: 'Ceritakan sedikit tentang dirimu',
    description: 'Informasi ini membantu kami menyesuaikan tingkat kesulitan case untukmu.',
  },
];

export function OnboardingWizard() {
  const shouldReduceMotion = useReducedMotion();
  const next = useSearchParams().get('next');
  const { user } = useCurrentUser();
  const completeOnboarding = useCompleteOnboarding(next);
  const [step, setStep] = useState(0);

  const {
    control,
    register,
    handleSubmit,
    trigger,
    setError,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { fieldKeys: [], major: '' },
  });

  const goToProfileStep = async () => {
    if (await trigger('fieldKeys')) setStep(1);
  };

  const onSubmit = (values: OnboardingFormValues) =>
    completeOnboarding.mutate(values, {
      onError: (error) =>
        getApiFieldErrors(error).forEach(({ field, message }) =>
          setError(field as keyof OnboardingFormValues, { message })
        ),
    });

  const firstName = user?.name.split(' ')[0];
  const current = STEPS[step];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div
        className="flex items-center gap-2"
        aria-label={`Langkah ${step + 1} dari ${STEPS.length}`}
      >
        {STEPS.map((item, index) => (
          <span
            key={item.title}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-soft"
            aria-hidden="true"
          >
            <span
              className={cn(
                'block h-full origin-left rounded-full bg-brand transition-transform duration-500',
                index <= step ? 'scale-x-100' : 'scale-x-0'
              )}
            />
          </span>
        ))}
      </div>
      <p className="mt-3 font-mono text-xs text-ink-subtle tabular-nums">
        Langkah {step + 1} dari {STEPS.length}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={shouldReduceMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4"
          >
            <h1 className="text-page-title">{current.title}</h1>
            <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-pretty text-ink-muted">
              {step === 0 && firstName ? `Hai ${firstName}. ` : ''}
              {current.description}
            </p>

            <div className="mt-8">
              {step === 0 ? (
                <Controller
                  control={control}
                  name="fieldKeys"
                  render={({ field }) => (
                    <FieldPicker
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.fieldKeys?.message}
                    />
                  )}
                />
              ) : (
                <div className="grid gap-6">
                  <Controller
                    control={control}
                    name="studentStatus"
                    render={({ field }) => (
                      <StatusPicker
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.studentStatus?.message}
                      />
                    )}
                  />
                  <TextField
                    id="major"
                    label="Jurusan (opsional)"
                    placeholder="Contoh: Sistem Informasi"
                    autoComplete="off"
                    error={errors.major?.message}
                    {...register('major')}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-6">
          {step === 0 ? (
            <span />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="pill-lg"
              onClick={() => setStep(0)}
              disabled={completeOnboarding.isPending}
            >
              <ArrowLeft />
              Kembali
            </Button>
          )}

          {step === 0 ? (
            <Button
              key="next"
              type="button"
              size="pill-lg"
              className="group active:scale-[0.98]"
              onClick={goToProfileStep}
            >
              Lanjut
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Button>
          ) : (
            <Button
              key="submit"
              type="submit"
              size="pill-lg"
              disabled={completeOnboarding.isPending}
            >
              {completeOnboarding.isPending && <Loader2 className="animate-spin" />}
              {completeOnboarding.isPending ? 'Menyimpan…' : 'Selesai dan mulai'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
