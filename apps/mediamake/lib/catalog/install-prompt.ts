/** Where the public installer instructions live. */
export const INSTALL_GUIDE_URL = 'https://github.com/microfox-ai/mediamake/blob/main/install.md';

/** MediaMake's own domain: what install prompts and the hosted MCP's card point people at. */
export const CANONICAL_SITE = 'https://mediamake.microfox.app';

/**
 * The site people are sent to: MEDIAMAKE_PUBLIC_URL when set, else
 * NEXT_PUBLIC_APP_URL. Production's *.vercel.app address is never handed out
 * (it is only the deployment's own name): the canonical domain is used instead.
 * Preview deployments keep their own address.
 */
export function siteUrl(): string | undefined {
  const configured = (process.env.MEDIAMAKE_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL)?.trim().replace(/\/+$/, '');
  if (!configured) return undefined;
  if (process.env.VERCEL_ENV !== 'preview' && isVercelAppUrl(configured)) return CANONICAL_SITE;
  return configured;
}

function isVercelAppUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

/**
 * The one-line prompt that has Claude bring an installed item up to date
 * (install.md › Update an installed item, or the update-mediamake-items skill):
 * no install code, the install's update token covers it.
 */
export function updatePromptFor(itemId: string): string {
  const site = siteUrl();
  return `Update ${itemId} from MediaMake${site ? ` (${site})` : ''} by following ${INSTALL_GUIDE_URL}#update-an-installed-item`;
}

/** The one-line prompt that has Claude install an item and its dependencies. */
export function installPromptFor(itemId: string, installCode?: string): string {
  const site = siteUrl();
  return (
    `Set up ${itemId} from MediaMake${site ? ` (${site})` : ''}` +
    `${installCode ? ` with install code ${installCode}` : ''} by following ${INSTALL_GUIDE_URL}`
  );
}
