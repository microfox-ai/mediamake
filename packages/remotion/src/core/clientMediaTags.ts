import type { ComponentType } from 'react';

/**
 * Registry for the WebCodecs media tags used by @remotion/web-renderer.
 *
 * `@remotion/media` is ESM-only (its package `exports` map has no `require`
 * condition), so importing it from this package would break every CJS consumer
 * of @microfox/remotion — Next.js server bundles, the Lambda bundler, plain node
 * scripts. Instead the client-side-rendering entry point loads it dynamically
 * and hands the components in here; the atoms then read them synchronously at
 * render time.
 *
 * Only client-side rendering needs this. Player, Studio and Lambda keep using
 * `<Html5Audio>` / `<OffthreadVideo>`, which are unavailable in the web renderer
 * but are the battle-tested path everywhere else.
 */
export type ClientSideMediaTags = {
  Audio: ComponentType<any>;
  Video: ComponentType<any>;
};

let registered: ClientSideMediaTags | null = null;

/** Call before `renderMediaOnWeb` / `renderStillOnWeb`. */
export const registerClientSideMediaTags = (tags: ClientSideMediaTags): void => {
  registered = tags;
};

export const getClientSideMediaTags = (): ClientSideMediaTags | null =>
  registered;
