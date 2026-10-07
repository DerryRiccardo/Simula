'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** Filter/search disimpan di query string agar bisa dibagikan dan bertahan saat reload. */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // router.replace baru memperbarui searchParams setelah render berikutnya. Perubahan beruntun
  // (mis. dua filter diklik cepat) dihitung dari nilai yang tertunda agar tidak saling menimpa.
  const pendingQueryRef = useRef<string | null>(null);
  useEffect(() => {
    pendingQueryRef.current = null;
  }, [searchParams]);

  const setParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(pendingQueryRef.current ?? searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      const query = params.toString();
      pendingQueryRef.current = query;
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return { searchParams, setParams };
}
