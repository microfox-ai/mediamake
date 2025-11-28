import { enableTailwind } from '@remotion/tailwind-v4';
import path from 'path';

/**
 *  @param {import('webpack').Configuration} currentConfig
 */
export const webpackOverride = currentConfig => {
  const config = enableTailwind(currentConfig);

  // Suppress all warnings
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    /Module not found.*@remotion\/google-fonts/,
    /Can't resolve '@remotion\/google-fonts'/,
    /Can't resolve 'noise'/,
    /Can't resolve 'paper-texture'/,
  ];

  // Ensure proper resolution
  config.resolve = config.resolve || {};

  // Add fallbacks for Tailwind CSS utilities that aren't real modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    noise: false,
    'paper-texture': false,
    grain: false,
    texture: false,
  };

  // Also try aliasing to @remotion/noise if they exist
  config.resolve.alias = {
    ...config.resolve.alias,
    noise: '@remotion/noise',
  };

  return config;
};
