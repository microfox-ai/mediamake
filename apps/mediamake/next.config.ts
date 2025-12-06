import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
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
      });
    }

    // // Ignore specific problematic files and Node.js modules
    // config.resolve.fallback = {
    //   ...config.resolve.fallback,
    //   fs: false,
    //   path: false,
    //   os: false,
    //   net: false,
    //   tls: false,
    //   child_process: false,
    //   dns: false,
    //   crypto: false,
    //   stream: false,
    //   util: false,
    //   url: false,
    //   querystring: false,
    //   http: false,
    //   https: false,
    //   zlib: false,
    //   events: false,
    //   buffer: false,
    //   process: false,
    // };

    // Add resolve aliases to avoid problematic modules
    config.resolve.alias = {
      ...config.resolve.alias,
      esbuild: false,
      rollup: false,
      '@rollup/rollup-linux-x64-gnu': false,
      mongodb: false,
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
