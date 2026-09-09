import { enableTailwind } from '@remotion/tailwind-v4';

/**
 *  @param {import('webpack').Configuration} currentConfig
 */
export const webpackOverride = currentConfig => {
  const config = enableTailwind(currentConfig);
  // Suppress all warnings
  // Alternative: suppress specific warnings
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    /Module not found.*@remotion\/google-fonts/,
    /Can't resolve '@remotion\/google-fonts'/,
  ];

  // @remotion/google-fonts includes LICENSE.md at package root; ignore markdown
  // if a dynamic import context ever pulls it in.
  config.module = config.module || {};
  config.module.rules = config.module.rules || [];
  config.module.rules.push({
    test: /\.md$/,
    type: 'asset/resource',
    generator: {
      emit: false,
    },
  });

  // // Exclude AWS SDK packages from bundle (not needed for Remotion site deployment)
  // // These are only used for upload endpoints which aren't part of the Remotion bundle
  // config.externals = [
  //   ...(config.externals || []),
  //   /^@aws-sdk\/.*/,
  //   /^aws-sdk$/,
  //   /^@smithy\/.*/,
  // ];

  return config;
};
