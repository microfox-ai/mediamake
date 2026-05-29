import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  // Prevent Next.js from bundling packages that use dynamic require() patterns
  // (e.g. clone-deep → lazy-cache uses require(name, alias) which webpack can't parse).
  serverExternalPackages: ['clone-deep', 'lazy-cache', 'shallow-clone', 'kind-of', 'for-own', 'is-plain-object'],
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Don't parse clone-deep / lazy-cache — they use require(name, alias) which
    // webpack cannot statically analyse. noParse skips the AST walk entirely.
    config.module.noParse = [
      ...(Array.isArray(config.module.noParse) ? config.module.noParse : config.module.noParse ? [config.module.noParse] : []),
      /node_modules[\\/]clone-deep[\\/]/,
      /node_modules[\\/]lazy-cache[\\/]/,
    ];

    // Exclude TypeScript declaration files from webpack processing
    config.module.rules.push({
      test: /\.d\.ts$/,
      type: 'asset/resource',
      generator: {
        emit: false,
      },
    });

    // Handle esbuild and other problematic modules by excluding them
    config.module.rules.push({
      test: /node_modules\/(@remotion\/bundler|esbuild|terser-webpack-plugin|rollup)/,
      type: 'asset/resource',
      generator: {
        emit: false,
      },
    });

    // Exclude problematic files from bundling
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        '@remotion/bundler': 'commonjs @remotion/bundler',
        '@remotion/renderer': 'commonjs @remotion/renderer',
        esbuild: 'commonjs esbuild',
        rollup: 'commonjs rollup',
        '@rollup/rollup-linux-x64-gnu': 'commonjs @rollup/rollup-linux-x64-gnu',
        mongodb: 'commonjs mongodb',
        // Note: ffmpeg/ffprobe installers are externalized but binaries should be available
        // in node_modules. The path resolution in the code handles Vercel/serverless environments.
        '@ffmpeg-installer/ffmpeg': 'commonjs @ffmpeg-installer/ffmpeg',
        '@ffprobe-installer/ffprobe': 'commonjs @ffprobe-installer/ffprobe',
        // Externalize fluent-ffmpeg to avoid bundling issues and warnings
        'fluent-ffmpeg': 'commonjs fluent-ffmpeg',
        // Treat sharp as a Node runtime dependency, not something to bundle.
        sharp: 'commonjs sharp',
      });
    }

    // Add resolve aliases to avoid problematic modules
    config.resolve.alias = {
      ...config.resolve.alias,
      esbuild: false,
      rollup: false,
      '@rollup/rollup-linux-x64-gnu': false,
      mongodb: false,
      // In client bundles, completely stub out sharp/detect-libc so webpack
      // never walks their dependency tree.
      ...(isServer
        ? {}
        : {
            sharp: false,
            'sharp$': false,
            'detect-libc': false,
          }),
    };

    // Suppress warnings for optional dependencies and fluent-ffmpeg
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Module not found.*@remotion\/google-fonts/,
      /Can't resolve '@remotion\/google-fonts'/,
      /Module not found.*mongodb/,
      /Can't resolve 'mongodb'/,
      /Module not found.*net/,
      /Module not found.*tls/,
      /Module not found.*child_process/,
      /Module not found.*dns/,
      // Suppress fluent-ffmpeg warnings
      /Critical dependency: the request of a dependency is an expression/,
      /fluent-ffmpeg/,
      // Suppress webpack cache warnings about large strings
      /Serializing big s  trings/,
    ];

    // Suppress specific webpack cache warnings
    if (config.cache) {
      config.cache = {
        ...config.cache,
        compression: 'gzip' as const,
      };
    }

    return config;
  },
};

export default nextConfig;
