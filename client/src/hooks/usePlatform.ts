'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { FIELD_OPTIONS, getFieldIcon, type IFieldOption } from '@/constants/fields';
import { DEFAULT_PLATFORM_SETTINGS } from '@/constants/platformSettings';
import { getPublicFields, getPublicSettings } from '@/services/platform';
import type { IPlatformSettings } from '@/types';

const STALE_TIME_MS = 5 * 60 * 1000;

export const PLATFORM_QUERY_KEYS = {
  fields: ['platform', 'fields'] as const,
  settings: ['platform', 'settings'] as const,
};

export function useActiveFields() {
  const query = useQuery({
    queryKey: PLATFORM_QUERY_KEYS.fields,
    queryFn: getPublicFields,
    staleTime: STALE_TIME_MS,
  });

  const fields: IFieldOption[] = useMemo(() => {
    if (!query.data || query.data.length === 0) return FIELD_OPTIONS;
    return query.data.map((item) => ({
      key: item.key,
      label: item.label,
      description: item.description,
      icon: getFieldIcon(item.key),
    }));
  }, [query.data]);

  const fieldByKey = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.key, field])),
    [fields]
  );

  const filterOptions = useMemo(
    () => [
      { value: 'all', label: 'Semua bidang' },
      ...fields.map((f) => ({ value: f.key, label: f.label })),
    ],
    [fields]
  );

  return { ...query, fields, fieldByKey, filterOptions };
}

export function usePlatformSettings(): IPlatformSettings {
  const query = useQuery({
    queryKey: PLATFORM_QUERY_KEYS.settings,
    queryFn: getPublicSettings,
    staleTime: STALE_TIME_MS,
  });
  return query.data ?? DEFAULT_PLATFORM_SETTINGS;
}

export function useWhatsappUrl(): string {
  const settings = usePlatformSettings();
  return `https://wa.me/${settings.whatsappNumber}`;
}
