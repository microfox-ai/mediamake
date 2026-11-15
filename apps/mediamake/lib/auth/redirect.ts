/**
 * Where people land after signing in. Kept free of server imports so pages
 * and client components can share it.
 */

/** After /login and /signup. Becomes /app when the signed-in app ships. */
export const AFTER_SIGN_IN = '/';
/** After Core's own form. */
export const AFTER_CORE_SIGN_IN = '/core/projects';
/** Where a signed-in person manages how they sign in. */
export const ACCOUNT_PAGE = '/core/api-keys';

/** `value` when it is a path on this site, else `fallback`. Never another site. */
export function safeRedirect(value: string | null | undefined, fallback: string = AFTER_SIGN_IN): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}

/** The invite code in a `redirectTo` that points at /access?code=…, which is where invite links lead. */
export function inviteCodeFrom(redirectTo: string | null | undefined): string | undefined {
  if (!redirectTo || !redirectTo.startsWith('/access?')) return undefined;
  return new URLSearchParams(redirectTo.slice('/access?'.length)).get('code')?.trim() || undefined;
}

/** A login-family address that carries `redirectTo` along. */
export function withRedirect(path: string, redirectTo: string | null | undefined): string {
  const target = safeRedirect(redirectTo, '');
  return target ? `${path}${path.includes('?') ? '&' : '?'}redirectTo=${encodeURIComponent(target)}` : path;
}
