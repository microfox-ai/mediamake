import { createRequire } from 'node:module';
import type { NextConfig } from "next";

const require = createRequire(import.meta.url);

function resolvePkgEntry(pkg: string): string {
  return require.resolve(pkg);
}

const nextConfig: NextConfig = {
  /* config options here */
  // Don't fail build on ESLint errors (common for example projects)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Don't fail build on TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer, webpack }) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@codemirror/state': resolvePkgEntry('@codemirror/state'),
      '@codemirror/view': resolvePkgEntry('@codemirror/view'),
      '@codemirror/language': resolvePkgEntry('@codemirror/language'),
      '@codemirror/autocomplete': resolvePkgEntry('@codemirror/autocomplete'),
      '@codemirror/commands': resolvePkgEntry('@codemirror/commands'),
      '@codemirror/search': resolvePkgEntry('@codemirror/search'),
      '@lezer/common': resolvePkgEntry('@lezer/common'),
    };

    if (!isServer) {
      config.plugins.push(
        // The browser bundle does not need the Node MongoDB driver.
        new webpack.IgnorePlugin({ resourceRegExp: /^mongodb$/ }),
      );
    }
    return config;
  },
};

export default nextConfig;
