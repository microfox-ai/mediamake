/** Where the public installer instructions live. */
export const INSTALL_GUIDE_URL = 'https://github.com/microfox-ai/mediamake/blob/main/install.md';

/** Base URL of this MediaMake site, for prompts people paste elsewhere. */
export function siteUrl(): string | undefined {
  return (process.env.MEDIAMAKE_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL)?.replace(/\/$/, '') || undefined;
}

/** The one-line prompt that has Claude install an item and its dependencies. */
export function installPromptFor(itemId: string, installCode?: string): string {
  const site = siteUrl();
  return (
    `Set up ${itemId} from MediaMake${site ? ` (${site})` : ''}` +
    `${installCode ? ` with install code ${installCode}` : ''} by following ${INSTALL_GUIDE_URL}`
  );
}
