'use client';

import { useQuery } from '@tanstack/react-query';

import { certificateService } from '@/services/certificate';
import { learningKeys } from './useLearning';

export function useCertificateVerification(id: string) {
  return useQuery({
    queryKey: learningKeys.certificate(id),
    queryFn: () => certificateService.verify(id),
  });
}
