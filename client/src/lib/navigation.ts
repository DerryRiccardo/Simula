/** Path cocok persis (atau sebagai induk bila isPrefix) dan semua query di href ikut cocok. */
export function matchesNavHref(
  href: string,
  pathname: string,
  searchParams: URLSearchParams,
  isPrefix: boolean
) {
  const [path, query] = href.split('?');
  const isPathMatch = pathname === path || (isPrefix && pathname.startsWith(`${path}/`));
  if (!isPathMatch || !query) return isPathMatch;
  return [...new URLSearchParams(query)].every(([key, value]) => searchParams.get(key) === value);
}
