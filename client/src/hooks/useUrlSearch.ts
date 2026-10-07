'use client';

import { useEffect, useRef, useState } from 'react';

import { useDebounce } from './useDebounce';

/**
 * Input pencarian yang disinkronkan ke query `search` dengan debounce.
 * `setParams` berasal dari useUrlParams.
 */
export function useUrlSearch(
  urlSearch: string,
  setParams: (updates: Record<string, string | null>) => void,
  delay = 400
) {
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchInput.trim(), delay);

  // Tulis ke URL hanya saat nilai debounce berubah, agar reset filter tidak tertimpa nilai lama.
  const lastDebouncedRef = useRef(debouncedSearch);
  useEffect(() => {
    if (debouncedSearch === lastDebouncedRef.current) return;
    lastDebouncedRef.current = debouncedSearch;
    setParams({ search: debouncedSearch || null });
  }, [debouncedSearch, setParams]);

  return { searchInput, setSearchInput, clearSearch: () => setSearchInput('') };
}
