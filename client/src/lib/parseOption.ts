/** Ambil nilai query string hanya jika termasuk opsi yang valid; selain itu pakai fallback. */
export const parseOption = <T extends string>(
  options: readonly { value: T }[],
  value: string | null,
  fallback: T
): T => options.find((option) => option.value === value)?.value ?? fallback;
