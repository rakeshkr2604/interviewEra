/**
 * Path matching for marketing + app navigation active states.
 */
export function isNavPathActive(pathname: string, href: string, exact = false): boolean {
  const path = href.split('?')[0] ?? href;
  if (exact) return pathname === path;
  if (pathname === path) return true;
  if (path !== '/' && pathname.startsWith(`${path}/`)) return true;
  return false;
}

export function isAnyNavPathActive(
  pathname: string,
  hrefs: readonly string[],
  exact = false,
): boolean {
  return hrefs.some((href) => isNavPathActive(pathname, href, exact));
}
