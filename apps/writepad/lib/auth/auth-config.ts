const normalizePath = (pathname: string): string => {
  if (!pathname) return '/';
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
};

/**
 * Regex patterns for pages that should remain public.
 * Keep this list small and explicit.
 */
export const publicPagePatterns: RegExp[] = [
  /^\/$/,
  /^\/login$/,
];

/**
 * API auth endpoints are intentionally excluded from middleware auth checks.
 */
export const authApiExemptPatterns: RegExp[] = [
  /^\/api\/login$/,
  /^\/api\/logout$/,
  /^\/api\/session$/,
];

/**
 * Regex prefixes for API routes protected by middleware auth.
 * Current policy: protect all API routes except authApiExemptPatterns.
 */
export const protectedApiPrefixPatterns: RegExp[] = [
  /^\/api(?:\/|$)/,
];

export const isPublicPagePath = (pathname: string): boolean => {
  const normalized = normalizePath(pathname);
  return publicPagePatterns.some((pattern) => pattern.test(normalized));
};

export const isAuthApiExemptPath = (pathname: string): boolean => {
  const normalized = normalizePath(pathname);
  return authApiExemptPatterns.some((pattern) => pattern.test(normalized));
};

export const isProtectedApiPath = (pathname: string): boolean => {
  const normalized = normalizePath(pathname);
  if (isAuthApiExemptPath(normalized)) {
    return false;
  }
  return protectedApiPrefixPatterns.some((pattern) => pattern.test(normalized));
};
