import type { NextConfig } from "next";

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
