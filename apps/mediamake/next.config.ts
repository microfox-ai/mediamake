import type { NextConfig } from 'next';
import packageJson from './package.json';

// Top-level folders of app/core: the signed-in app with the sidebar, the
// editor, admin tools and the agent studio.
const CORE_PAGES = [
  'agents', 'api-keys', 'billing', 'dashboard', 'dev', 'history', 'image-history',
  'media', 'midjourney', 'midjourney-queue', 'player', 'presets', 'projects', 'quota',
  'studio-3d', 'transcriber', 'video-history', 'workers', 'youtube-splits',
  'editor', 'preset-batch-creator', 'studio',
];

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  // Dev compiles each route on demand, then drops it. The defaults keep only
  // ~2 routes for ~60s, so the next hit on an unchanged API route compiles it
  // again. Hold the compiled routes in memory for the dev session instead.
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 100,
  },
  // Signed-in pages moved under /core; keep old links and bookmarks working.
  async redirects() {
    return CORE_PAGES.map((page) => ({
      source: `/${page}/:path*`,
      destination: `/core/${page}/:path*`,
      permanent: false,
    }));
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@tabler/icons-react'],
  },
  // Prevent Next.js from bundling packages that use dynamic require() patterns
  // (e.g. clone-deep → lazy-cache uses require(name, alias) which webpack can't parse).
  serverExternalPackages: ['clone-deep', 'lazy-cache', 'shallow-clone', 'kind-of', 'for-own', 'is-plain-object'],
  // The dev-lyrics routes read apps/lyrics_videos from disk under `next dev` only
  // (lib/remotion-editor/server/lyrics-fs.ts). Tracing would copy that whole folder,
  // including gitignored local projects, into the deployed functions.
  outputFileTracingExcludes: {
    '/api/dev-lyrics/**': ['../lyrics_videos/**'],
  },
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

    // @remotion/google-fonts ships LICENSE.md / README.md at the package root.
    // Dynamic import contexts can pull them in; don't let webpack parse markdown.
    config.module.rules.push({
      test: /\.md$/,
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

    // Asset dumps and worker output change often and are not source. Watching
    // them invalidates the compile of every route that happens to be loaded.
    // Next's default `ignored` is a RegExp. This Webpack accepts that RegExp
    // or an array of non-empty glob strings, not a mix of the two.
    const extraIgnored = ['**/public/assets/**', '**/.serverless-workers/**'];
    const previousIgnored = config.watchOptions?.ignored;
    const previousGlobs = Array.isArray(previousIgnored)
      ? previousIgnored.filter(
          (pattern): pattern is string =>
            typeof pattern === 'string' && pattern.length > 0,
        )
      : typeof previousIgnored === 'string' && previousIgnored.length > 0
        ? [previousIgnored]
        : ['**/.git/**', '**/node_modules/**', '**/.next/**'];
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [...previousGlobs, ...extraIgnored],
    };

    return config;
  },
};

export default nextConfig;
